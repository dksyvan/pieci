import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Correspondance } from './entities/correspondance.entity';
import { JournalAccesContact } from '../journal-acces-contact/entities/journal-acces-contact.entity';
import { StatutCorrespondance } from '../common/enums';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CorrespondanceResumeDto } from './dto/correspondance-resume.dto';
import { ContactDto } from './dto/contact.dto';
import { DefisService } from './defis.service';
import { poidsReponse, prenomsConcordent } from './prenoms';
import { initialesPrenom } from '../common/affichage';

type Role = 'trouveur' | 'demandeur';

const RELATIONS = {
  pieceTrouvee: { declarant: true },
  alertePerte: { utilisateur: true },
} as const;

@Injectable()
export class CorrespondancesService {
  constructor(
    @InjectRepository(Correspondance)
    private readonly correspondances: Repository<Correspondance>,
    @InjectRepository(JournalAccesContact)
    private readonly journal: Repository<JournalAccesContact>,
    private readonly utilisateurs: UtilisateursService,
    private readonly notifications: NotificationsService,
    private readonly defis: DefisService,
  ) {}

  /** Liste les correspondances où l'utilisateur est l'une des deux parties. */
  async findByTelephone(telephone: string): Promise<CorrespondanceResumeDto[]> {
    const utilisateur = await this.utilisateurs.findByTelephone(telephone);
    if (!utilisateur) return [];

    const correspondances = await this.correspondances
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.pieceTrouvee', 'piece')
      .innerJoinAndSelect('piece.declarant', 'declarant')
      .innerJoinAndSelect('c.alertePerte', 'alerte')
      .innerJoinAndSelect('alerte.utilisateur', 'demandeur')
      .where('declarant.id = :id OR demandeur.id = :id', { id: utilisateur.id })
      .orderBy('c.dateCalcul', 'DESC')
      .getMany();

    return correspondances.map((c) => this.versResume(c, utilisateur));
  }

  /**
   * Confirme la correspondance pour la partie identifiée par `telephone`.
   * Le passage à `confirmee` (et donc la révélation du contact) requiert
   * l'accord des deux parties — cf. CLAUDE.md section 2.
   */
  async confirmer(id: string, telephone: string): Promise<CorrespondanceResumeDto> {
    const { correspondance, utilisateur, role } = await this.chargerEtAutoriser(id, telephone);
    this.assurerNonFinalisee(correspondance);

    /*
     * Le demandeur ne confirme qu'après avoir montré qu'il connaît les
     * prénoms inscrits sur la pièce.
     *
     * Le défi est ici, et pas seulement derrière le bouton « C'est ma pièce »
     * de la fiche, parce que ce bouton se contourne. Le nom de famille est
     * public et pèse 0,45 dans le rapprochement : quiconque le lit sur le
     * registre, puis crée une alerte avec ce nom et un prénom inventé,
     * obtient 0,70 — une correspondance « probable ». Seul un contrôle au
     * moment de confirmer ferme ce chemin.
     */
    if (role === 'demandeur') this.verifierDefiALaConfirmation(correspondance, utilisateur);

    const maintenant = new Date();
    if (role === 'trouveur') {
      correspondance.confirmationTrouveur = maintenant;
    } else {
      correspondance.confirmationDemandeur = maintenant;
    }

    const confirmationMutuelle =
      !!correspondance.confirmationTrouveur && !!correspondance.confirmationDemandeur;

    if (confirmationMutuelle) {
      correspondance.statut = StatutCorrespondance.CONFIRMEE;
      correspondance.dateConfirmation = maintenant;
    }

    const sauvegardee = await this.correspondances.save(correspondance);

    if (confirmationMutuelle) {
      await Promise.all([
        this.notifications.creer({
          utilisateurId: sauvegardee.pieceTrouvee.declarant.id,
          titre: 'Correspondance confirmée',
          contenu:
            'Les deux parties ont confirmé : vous pouvez maintenant accéder aux coordonnées de contact.',
          correspondanceId: sauvegardee.id,
        }),
        this.notifications.creer({
          utilisateurId: sauvegardee.alertePerte.utilisateur.id,
          titre: 'Correspondance confirmée',
          contenu:
            'Les deux parties ont confirmé : vous pouvez maintenant accéder aux coordonnées de contact.',
          correspondanceId: sauvegardee.id,
        }),
      ]);
    } else {
      const autre = this.autrePartie(sauvegardee, role);
      await this.notifications.creer({
        utilisateurId: autre.id,
        titre: 'Correspondance à confirmer',
        contenu:
          "L'autre partie a confirmé une correspondance potentielle. Confirmez-la à votre tour pour échanger vos coordonnées.",
        correspondanceId: sauvegardee.id,
      });
    }

    return this.versResume(sauvegardee, utilisateur);
  }

  /**
   * Défi des prénoms : le demandeur écrit les prénoms inscrits sur la pièce.
   *
   * Message d'échec neutre — « Ça ne correspond pas. » — sans jamais dire
   * ce qui est faux ni combien de prénoms sont attendus. Trois essais par
   * demandeur sur trente minutes, dix par pièce sur une journée
   * (DefisService). C'est le seul chemin qui lève le défi pour une alerte
   * créée après la pièce, et il est compté.
   */
  async repondreDefi(
    id: string,
    telephone: string,
    prenoms: string,
  ): Promise<CorrespondanceResumeDto> {
    const { correspondance, utilisateur, role } = await this.chargerEtAutoriser(id, telephone);
    if (role !== 'demandeur') {
      throw new ForbiddenException('Seule la personne qui cherche sa pièce répond à cette question.');
    }
    this.assurerNonFinalisee(correspondance);

    if (!this.defiNecessaire(correspondance)) return this.versResume(correspondance, utilisateur);

    const piece = correspondance.pieceTrouvee;
    this.assurerNonBloque(piece.id, utilisateur.telephone);

    if (!prenomsConcordent(prenoms, piece.prenom)) {
      this.defis.echec(piece.id, utilisateur.telephone, poidsReponse(prenoms, piece.prenom));
      throw new BadRequestException('Ça ne correspond pas.');
    }

    this.defis.succes(piece.id, utilisateur.telephone);
    correspondance.defiReussiLe = new Date();
    const sauvegardee = await this.correspondances.save(correspondance);
    return this.versResume(sauvegardee, utilisateur);
  }

  /**
   * Le défi reste-t-il à passer ? Non s'il est réussi, ni si la pièce n'a pas
   * de prénom renseigné — il n'y a rien à demander, et la confirmation du
   * trouveur reste la seule validation.
   */
  private defiNecessaire(correspondance: Correspondance): boolean {
    return !correspondance.defiReussiLe && !!correspondance.pieceTrouvee.prenom?.trim();
  }

  /** L'alerte existait-elle avant la déclaration de la pièce ? */
  private alerteAnterieure(correspondance: Correspondance): boolean {
    const { pieceTrouvee: piece, alertePerte: alerte } = correspondance;
    return (
      !!alerte.createdAt &&
      !!piece.createdAt &&
      new Date(alerte.createdAt).getTime() < new Date(piece.createdAt).getTime()
    );
  }

  /**
   * Faut-il afficher la question au demandeur ?
   *
   * Jamais en fonction des prénoms de son alerte : ce booléen se lit avant
   * tout essai, et dirait lesquels sont les bons. Deux versions l'ont fait —
   * la première pour toute alerte, la seconde pour les alertes antérieures à
   * la pièce, que l'on pouvait semer d'avance au même nom avec des prénoms
   * différents. La question est donc affichée pour toute alerte postérieure ;
   * une alerte antérieure garde le bouton « C'est ma pièce », et ses prénoms
   * sont vérifiés, et comptés, au clic (verifierDefiALaConfirmation).
   */
  private questionAffichee(correspondance: Correspondance): boolean {
    return (
      this.defiNecessaire(correspondance) &&
      (!this.alerteAnterieure(correspondance) || this.defis.questionPosee(correspondance.id))
    );
  }

  /**
   * Contrôle du défi quand le demandeur confirme.
   *
   * Pour une alerte créée avant la pièce, ses prénoms valent réponse : Koné,
   * qui a déclaré sa perte le 30 et dont la pièce est trouvée le 1er, confirme
   * d'un geste. Mais c'est une réponse comptée comme les autres. Pour une
   * alerte postérieure, qui a pu être fabriquée d'après le registre, seule la
   * réponse à la question lève le défi.
   */
  private verifierDefiALaConfirmation(correspondance: Correspondance, utilisateur: Utilisateur): void {
    if (!this.defiNecessaire(correspondance)) return;

    const refus = () =>
      new ForbiddenException({
        statusCode: 403,
        code: 'DEFI_REQUIS',
        message: 'Réponds d’abord à la question sur les prénoms inscrits sur la pièce.',
      });
    // Alerte postérieure, ou prénoms d'alerte déjà essayés : la question.
    if (!this.alerteAnterieure(correspondance) || this.defis.questionPosee(correspondance.id)) {
      throw refus();
    }

    const { pieceTrouvee: piece, alertePerte: alerte } = correspondance;
    this.assurerNonBloque(piece.id, utilisateur.telephone);

    // Un seul essai, de poids 1 : les prénoms de l'alerte n'ont pas été tapés
    // pour deviner, et le propriétaire qui les avait écrits en entier (« Adjoua
    // Marie Laure » pour une pièce « Adjoua ») ne doit pas se retrouver bloqué
    // à force de cliquer sur son propre bouton.
    if (!prenomsConcordent(alerte.prenom, piece.prenom)) {
      this.defis.echec(piece.id, utilisateur.telephone);
      this.defis.poserQuestion(correspondance.id);
      throw refus();
    }

    this.defis.succes(piece.id, utilisateur.telephone);
    correspondance.defiReussiLe = new Date();
  }

  /** Refuse, avec la vraie durée, un défi fermé pour ce demandeur ou pour la pièce. */
  private assurerNonBloque(pieceId: string, telephone: string): void {
    const blocage = this.defis.estBloque(pieceId, telephone);
    if (!blocage) return;
    throw new HttpException(
      blocage === 'piece'
        ? 'Trop d’essais sur cette pièce. Réessaie demain.'
        : 'Trop d’essais. Réessaie dans trente minutes.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** Rejette la correspondance. Un seul rejet suffit à la clôturer. */
  async rejeter(id: string, telephone: string): Promise<CorrespondanceResumeDto> {
    const { correspondance, utilisateur, role } = await this.chargerEtAutoriser(id, telephone);
    this.assurerNonFinalisee(correspondance);

    correspondance.statut = StatutCorrespondance.REJETEE;
    const sauvegardee = await this.correspondances.save(correspondance);

    const autre = this.autrePartie(sauvegardee, role);
    await this.notifications.creer({
      utilisateurId: autre.id,
      titre: 'Correspondance rejetée',
      contenu: "L'autre partie a indiqué que cette correspondance n'était pas la bonne.",
      correspondanceId: sauvegardee.id,
    });

    return this.versResume(sauvegardee, utilisateur);
  }

  /**
   * Révèle le contact de l'autre partie. N'est autorisé que si les deux
   * parties ont confirmé (statut `confirmee`) — cf. CLAUDE.md section 2.
   * Chaque accès accordé est journalisé dans journal_acces_contact.
   */
  async obtenirContact(id: string, telephone: string): Promise<ContactDto> {
    const { correspondance, utilisateur, role } = await this.chargerEtAutoriser(id, telephone);

    if (correspondance.statut !== StatutCorrespondance.CONFIRMEE) {
      throw new ForbiddenException(
        "Le contact n'est révélé qu'après confirmation des deux parties.",
      );
    }

    await this.journal.save(this.journal.create({ correspondance, utilisateur }));

    const autre = this.autrePartie(correspondance, role);

    return {
      prenom: autre.prenom,
      nom: autre.nom,
      telephone: autre.telephone,
      email: autre.email,
    };
  }

  private async chargerEtAutoriser(
    id: string,
    telephone: string,
  ): Promise<{ correspondance: Correspondance; utilisateur: Utilisateur; role: Role }> {
    const utilisateur = await this.utilisateurs.findByTelephone(telephone);
    if (!utilisateur) throw new NotFoundException('Utilisateur inconnu');

    const correspondance = await this.correspondances.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!correspondance) throw new NotFoundException('Correspondance introuvable');

    if (correspondance.pieceTrouvee.declarant.id === utilisateur.id) {
      return { correspondance, utilisateur, role: 'trouveur' };
    }
    if (correspondance.alertePerte.utilisateur.id === utilisateur.id) {
      return { correspondance, utilisateur, role: 'demandeur' };
    }

    throw new ForbiddenException("Vous n'êtes pas partie à cette correspondance");
  }

  private autrePartie(correspondance: Correspondance, role: Role): Utilisateur {
    return role === 'trouveur'
      ? correspondance.alertePerte.utilisateur
      : correspondance.pieceTrouvee.declarant;
  }

  private assurerNonFinalisee(correspondance: Correspondance): void {
    if (correspondance.statut !== StatutCorrespondance.SUGGEREE) {
      throw new BadRequestException('Cette correspondance est déjà finalisée');
    }
  }

  private versResume(
    correspondance: Correspondance,
    utilisateur: Utilisateur,
  ): CorrespondanceResumeDto {
    const estTrouveur = correspondance.pieceTrouvee.declarant.id === utilisateur.id;
    const piece = correspondance.pieceTrouvee;
    const alerte = correspondance.alertePerte;
    /*
     * L'alerte, vue par le trouveur, reste réduite jusqu'à la double
     * confirmation, comme la pièce l'est pour le demandeur. Rien ne vérifie
     * qu'un trouveur a la pièce en main : une fausse déclaration au nom de
     * KOUASSI livrait sinon les prénoms et le quartier de toutes les alertes
     * KOUASSI — la réponse du défi, et davantage.
     */
    const alerteReduite = estTrouveur && correspondance.statut !== StatutCorrespondance.CONFIRMEE;

    return {
      id: correspondance.id,
      /*
       * Ni score ni niveau, pour personne. Ils mesurent aussi la ressemblance
       * des prénoms et la distance au lieu exact, à quatre décimales : en
       * créant des alertes au nom public et en lisant le score, on retrouvait
       * le prénom de la pièce lettre par lettre (« Adj » 0,79, « Adjo » 0,83,
       * « Adjoua » 0,89) et la position du trouveur. Le trouveur n'est pas une
       * exception : rien ne prouve qu'il a la pièce, et une fausse déclaration
       * lisait de la même façon les prénoms des alertes.
       */
      score: null,
      niveauConfiance: null,
      statut: correspondance.statut,
      dateCalcul: correspondance.dateCalcul,
      pieceTrouvee: {
        id: piece.id,
        typePiece: piece.typePiece,
        /*
         * Le demandeur ne reçoit jamais le prénom complet de la pièce : ce
         * serait lui donner la réponse du défi. Il voit ce que voit le public,
         * le nom en capitales et les initiales. Le trouveur, qui a déclaré la
         * pièce, voit ce qu'il a lui-même écrit.
         */
        prenom: estTrouveur ? piece.prenom : (initialesPrenom(piece.prenom) ?? ''),
        nom: estTrouveur ? piece.nom : piece.nom.trim().toUpperCase(),
        commune: correspondance.pieceTrouvee.commune,
        quartier: correspondance.pieceTrouvee.quartier,
        dateTrouvaille: correspondance.pieceTrouvee.dateTrouvaille,
        photoFlouteeUrl: correspondance.pieceTrouvee.photoFlouteeUrl,
      },
      alertePerte: {
        id: alerte.id,
        typePiece: alerte.typePiece,
        prenom: alerteReduite ? (initialesPrenom(alerte.prenom) ?? '') : alerte.prenom,
        nom: alerteReduite ? alerte.nom.trim().toUpperCase() : alerte.nom,
        commune: alerte.commune,
        quartier: alerteReduite ? null : alerte.quartier,
      },
      confirmeParMoi: estTrouveur
        ? !!correspondance.confirmationTrouveur
        : !!correspondance.confirmationDemandeur,
      confirmeParAutre: estTrouveur
        ? !!correspondance.confirmationDemandeur
        : !!correspondance.confirmationTrouveur,
      defiRequis:
        !estTrouveur &&
        correspondance.statut === StatutCorrespondance.SUGGEREE &&
        this.questionAffichee(correspondance),
    };
  }
}
