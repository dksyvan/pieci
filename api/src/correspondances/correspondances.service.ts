import {
  BadRequestException,
  ForbiddenException,
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

    return {
      id: correspondance.id,
      score: correspondance.score,
      niveauConfiance: correspondance.niveauConfiance,
      statut: correspondance.statut,
      dateCalcul: correspondance.dateCalcul,
      pieceTrouvee: {
        id: correspondance.pieceTrouvee.id,
        typePiece: correspondance.pieceTrouvee.typePiece,
        prenom: correspondance.pieceTrouvee.prenom,
        nom: correspondance.pieceTrouvee.nom,
        commune: correspondance.pieceTrouvee.commune,
        quartier: correspondance.pieceTrouvee.quartier,
        dateTrouvaille: correspondance.pieceTrouvee.dateTrouvaille,
        photoFlouteeUrl: correspondance.pieceTrouvee.photoFlouteeUrl,
      },
      alertePerte: {
        id: correspondance.alertePerte.id,
        typePiece: correspondance.alertePerte.typePiece,
        prenom: correspondance.alertePerte.prenom,
        nom: correspondance.alertePerte.nom,
        commune: correspondance.alertePerte.commune,
        quartier: correspondance.alertePerte.quartier,
      },
      confirmeParMoi: estTrouveur
        ? !!correspondance.confirmationTrouveur
        : !!correspondance.confirmationDemandeur,
      confirmeParAutre: estTrouveur
        ? !!correspondance.confirmationDemandeur
        : !!correspondance.confirmationTrouveur,
    };
  }
}
