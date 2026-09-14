import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Correspondance } from './entities/correspondance.entity';
import { JournalAccesContact } from '../journal-acces-contact/entities/journal-acces-contact.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { PieceTrouvee } from '../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../alertes-perte/entities/alerte-perte.entity';
import type { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { CorrespondancesService } from './correspondances.service';
import { DefisService } from './defis.service';
import { NiveauConfiance, StatutCorrespondance, TypePiece } from '../common/enums';

const RELATIONS = {
  pieceTrouvee: { declarant: true },
  alertePerte: { utilisateur: true },
};

const trouveur = {
  id: 'user-trouveur',
  telephone: '+2250700000001',
  prenom: 'Awa',
  nom: 'Koné',
  email: null,
} as Utilisateur;

const demandeur = {
  id: 'user-demandeur',
  telephone: '+2250700000002',
  prenom: 'Issa',
  nom: 'Bamba',
  email: 'issa@example.com',
} as Utilisateur;

const tiers = {
  id: 'user-tiers',
  telephone: '+2250700000009',
  prenom: 'Koffi',
  nom: 'Yao',
  email: null,
} as Utilisateur;

const pieceTrouvee = {
  id: 'piece-1',
  typePiece: TypePiece.CNI,
  prenom: 'Issa',
  nom: 'Bamba',
  commune: 'Cocody',
  dateTrouvaille: new Date('2026-01-01T00:00:00Z'),
  photoFlouteeUrl: null,
  declarant: trouveur,
  createdAt: new Date('2026-01-01T12:00:00Z'),
} as PieceTrouvee;

const alertePerte = {
  id: 'alerte-1',
  typePiece: TypePiece.CNI,
  prenom: 'Issa',
  nom: 'Bamba',
  commune: 'Cocody',
  utilisateur: demandeur,
  // Alerte créée avant la déclaration de la pièce : le cas de Koné.
  createdAt: new Date('2025-12-30T08:00:00Z'),
} as AlertePerte;

function creerCorrespondance(overrides: Partial<Correspondance> = {}): Correspondance {
  return {
    id: 'corr-1',
    pieceTrouvee,
    alertePerte,
    score: 0.9,
    niveauConfiance: NiveauConfiance.FORTE,
    statut: StatutCorrespondance.SUGGEREE,
    dateCalcul: new Date('2026-01-02T00:00:00Z'),
    dateConfirmation: null,
    confirmationTrouveur: null,
    confirmationDemandeur: null,
    defiReussiLe: null,
    ...overrides,
  } as Correspondance;
}

function creerCorrespondancesRepoMock(
  options: { correspondance?: Correspondance | null; listeResultats?: Correspondance[] } = {},
) {
  const { correspondance = null, listeResultats = [] } = options;
  const findOne = vi.fn(async () => correspondance);
  const save = vi.fn(async (c: Correspondance) => c);

  const qb = {
    innerJoinAndSelect: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    getMany: vi.fn(async () => listeResultats),
  };
  qb.innerJoinAndSelect.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);

  const createQueryBuilder = vi.fn(() => qb);

  return { findOne, save, createQueryBuilder, qb } as unknown as Repository<Correspondance> & {
    qb: typeof qb;
  };
}

function creerJournalRepoMock() {
  const create = vi.fn((entity: Partial<JournalAccesContact>) => entity as JournalAccesContact);
  const save = vi.fn(async (entity: JournalAccesContact) => entity);
  return { create, save } as unknown as Repository<JournalAccesContact>;
}

function creerUtilisateursServiceMock(parTelephone: Record<string, Utilisateur | undefined>) {
  const findByTelephone = vi.fn(async (telephone: string) => parTelephone[telephone] ?? null);
  return { findByTelephone } as unknown as UtilisateursService;
}

function creerNotificationsMock() {
  const creer = vi.fn(async () => ({}) as Notification);
  return { creer } as unknown as NotificationsService;
}

describe('CorrespondancesService.confirmer', () => {
  it("première confirmation (trouveur) : le statut reste 'suggeree' et notifie l'autre partie", async () => {
    const correspondance = creerCorrespondance();
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const resultat = await service.confirmer('corr-1', trouveur.telephone);

    expect(resultat.statut).toBe(StatutCorrespondance.SUGGEREE);
    expect(resultat.confirmeParMoi).toBe(true);
    expect(resultat.confirmeParAutre).toBe(false);
    expect(correspondances.findOne).toHaveBeenCalledWith({
      where: { id: 'corr-1' },
      relations: RELATIONS,
    });
    expect(correspondances.save).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmationTrouveur: expect.any(Date),
        confirmationDemandeur: null,
        statut: StatutCorrespondance.SUGGEREE,
      }),
    );
    expect(notifications.creer).toHaveBeenCalledTimes(1);
    expect(notifications.creer).toHaveBeenCalledWith({
      utilisateurId: demandeur.id,
      titre: 'Correspondance à confirmer',
      contenu: expect.any(String),
      correspondanceId: 'corr-1',
    });
  });

  it("seconde confirmation (demandeur) : passe en 'confirmee', fixe dateConfirmation et notifie les deux parties", async () => {
    const correspondance = creerCorrespondance({
      confirmationTrouveur: new Date('2026-01-03T00:00:00Z'),
    });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [demandeur.telephone]: demandeur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const resultat = await service.confirmer('corr-1', demandeur.telephone);

    expect(resultat.statut).toBe(StatutCorrespondance.CONFIRMEE);
    expect(resultat.confirmeParMoi).toBe(true);
    expect(resultat.confirmeParAutre).toBe(true);
    expect(correspondances.save).toHaveBeenCalledWith(
      expect.objectContaining({
        statut: StatutCorrespondance.CONFIRMEE,
        dateConfirmation: expect.any(Date),
        confirmationDemandeur: expect.any(Date),
      }),
    );
    expect(notifications.creer).toHaveBeenCalledTimes(2);
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: trouveur.id, titre: 'Correspondance confirmée' }),
    );
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: demandeur.id, titre: 'Correspondance confirmée' }),
    );
  });

  it('rejette avec NotFoundException si le téléphone est inconnu', async () => {
    const correspondances = creerCorrespondancesRepoMock({ correspondance: creerCorrespondance() });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({});
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.confirmer('corr-1', '+2250700009999')).rejects.toThrow(NotFoundException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it("rejette avec NotFoundException si la correspondance n'existe pas", async () => {
    const correspondances = creerCorrespondancesRepoMock({ correspondance: null });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.confirmer('corr-x', trouveur.telephone)).rejects.toThrow(NotFoundException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it("rejette avec ForbiddenException si l'utilisateur n'est pas partie à la correspondance", async () => {
    const correspondances = creerCorrespondancesRepoMock({ correspondance: creerCorrespondance() });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [tiers.telephone]: tiers });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.confirmer('corr-1', tiers.telephone)).rejects.toThrow(ForbiddenException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it('rejette avec BadRequestException si la correspondance est déjà finalisée', async () => {
    const correspondance = creerCorrespondance({ statut: StatutCorrespondance.CONFIRMEE });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.confirmer('corr-1', trouveur.telephone)).rejects.toThrow(BadRequestException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });
});

describe('CorrespondancesService.rejeter', () => {
  it("passe la correspondance en 'rejetee' et notifie l'autre partie", async () => {
    const correspondance = creerCorrespondance();
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [demandeur.telephone]: demandeur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const resultat = await service.rejeter('corr-1', demandeur.telephone);

    expect(resultat.statut).toBe(StatutCorrespondance.REJETEE);
    expect(correspondances.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutCorrespondance.REJETEE }),
    );
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: trouveur.id, titre: 'Correspondance rejetée' }),
    );
  });

  it("rejette avec ForbiddenException si l'auteur n'est pas partie à la correspondance", async () => {
    const correspondances = creerCorrespondancesRepoMock({ correspondance: creerCorrespondance() });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [tiers.telephone]: tiers });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.rejeter('corr-1', tiers.telephone)).rejects.toThrow(ForbiddenException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it('rejette avec BadRequestException si la correspondance est déjà finalisée', async () => {
    const correspondance = creerCorrespondance({ statut: StatutCorrespondance.REJETEE });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.rejeter('corr-1', trouveur.telephone)).rejects.toThrow(BadRequestException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });
});

describe('CorrespondancesService.obtenirContact', () => {
  it('révèle le contact du demandeur au trouveur quand confirmee, et journalise l’accès', async () => {
    const correspondance = creerCorrespondance({ statut: StatutCorrespondance.CONFIRMEE });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const contact = await service.obtenirContact('corr-1', trouveur.telephone);

    expect(contact).toEqual({
      prenom: demandeur.prenom,
      nom: demandeur.nom,
      telephone: demandeur.telephone,
      email: demandeur.email,
    });
    expect(journal.create).toHaveBeenCalledWith({ correspondance, utilisateur: trouveur });
    expect(journal.save).toHaveBeenCalled();
  });

  it('révèle le contact du trouveur au demandeur quand confirmee', async () => {
    const correspondance = creerCorrespondance({ statut: StatutCorrespondance.CONFIRMEE });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [demandeur.telephone]: demandeur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const contact = await service.obtenirContact('corr-1', demandeur.telephone);

    expect(contact).toEqual({
      prenom: trouveur.prenom,
      nom: trouveur.nom,
      telephone: trouveur.telephone,
      email: trouveur.email,
    });
  });

  it("refuse l'accès tant que statut !== 'confirmee', sans journaliser", async () => {
    const correspondance = creerCorrespondance({ statut: StatutCorrespondance.SUGGEREE });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.obtenirContact('corr-1', trouveur.telephone)).rejects.toThrow(
      ForbiddenException,
    );
    expect(journal.save).not.toHaveBeenCalled();
  });

  it("refuse l'accès si l'utilisateur n'est pas partie à la correspondance, sans journaliser", async () => {
    const correspondance = creerCorrespondance({ statut: StatutCorrespondance.CONFIRMEE });
    const correspondances = creerCorrespondancesRepoMock({ correspondance });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [tiers.telephone]: tiers });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    await expect(service.obtenirContact('corr-1', tiers.telephone)).rejects.toThrow(ForbiddenException);
    expect(journal.save).not.toHaveBeenCalled();
  });
});

describe('CorrespondancesService.findByTelephone', () => {
  it('retourne une liste vide si le téléphone est inconnu, sans interroger les correspondances', async () => {
    const correspondances = creerCorrespondancesRepoMock();
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({});
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const resultat = await service.findByTelephone('+2250700009999');

    expect(resultat).toEqual([]);
    expect(correspondances.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('liste les correspondances du trouveur avec les indicateurs de confirmation appropriés', async () => {
    const correspondance = creerCorrespondance({
      confirmationTrouveur: new Date('2026-01-03T00:00:00Z'),
      confirmationDemandeur: null,
    });
    const correspondances = creerCorrespondancesRepoMock({ listeResultats: [correspondance] });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const resultat = await service.findByTelephone(trouveur.telephone);

    expect(resultat).toHaveLength(1);
    expect(resultat[0].confirmeParMoi).toBe(true);
    expect(resultat[0].confirmeParAutre).toBe(false);
    expect(resultat[0].pieceTrouvee.id).toBe('piece-1');
    expect(resultat[0].alertePerte.id).toBe('alerte-1');
    expect(correspondances.qb.where).toHaveBeenCalledWith('declarant.id = :id OR demandeur.id = :id', {
      id: trouveur.id,
    });
  });

  it('liste les correspondances du demandeur avec les rôles inversés', async () => {
    const correspondance = creerCorrespondance({
      confirmationTrouveur: new Date('2026-01-03T00:00:00Z'),
      confirmationDemandeur: null,
    });
    const correspondances = creerCorrespondancesRepoMock({ listeResultats: [correspondance] });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [demandeur.telephone]: demandeur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications, new DefisService());

    const resultat = await service.findByTelephone(demandeur.telephone);

    expect(resultat[0].confirmeParMoi).toBe(false);
    expect(resultat[0].confirmeParAutre).toBe(true);
  });
});

describe('défi des prénoms', () => {
  /**
   * Le nom de famille devient public et pèse 0,45 dans le rapprochement : un
   * inconnu qui le lit, puis crée une alerte avec un prénom inventé, obtient
   * une correspondance. Ces cas figent le fait qu'il ne peut pas aller plus
   * loin sans connaître les prénoms — et que le vrai propriétaire, lui, ne
   * voit jamais la question.
   */
  const alerteInventee = { ...alertePerte, prenom: 'Moussa' } as AlertePerte;

  function monter(correspondance: Correspondance, qui: Utilisateur, defis = new DefisService()) {
    const correspondances = creerCorrespondancesRepoMock({
      correspondance,
      listeResultats: [correspondance],
    });
    const utilisateurs = creerUtilisateursServiceMock({ [qui.telephone]: qui });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(
      correspondances,
      creerJournalRepoMock(),
      utilisateurs,
      notifications,
      defis,
    );
    return { service, correspondances, notifications };
  }

  it('empêche un demandeur au prénom inventé de confirmer, sans rien écrire', async () => {
    const { service, correspondances, notifications } = monter(
      creerCorrespondance({ alertePerte: alerteInventee }),
      demandeur,
    );

    await expect(service.confirmer('corr-1', demandeur.telephone)).rejects.toThrow(ForbiddenException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it('laisse confirmer sans question le demandeur dont l’alerte, antérieure à la pièce, portait les bons prénoms', async () => {
    const { service } = monter(creerCorrespondance(), demandeur);
    const resultat = await service.confirmer('corr-1', demandeur.telephone);
    expect(resultat.confirmeParMoi).toBe(true);
  });

  /**
   * Une alerte créée après la publication a pu être fabriquée d'après le
   * registre. Si ses prénoms suffisaient à lever le défi, chaque alerte
   * était un essai gratuit, invisible pour DefisService, et `defiRequis`
   * disait lequel était le bon.
   */
  it('exige le défi pour une alerte postérieure à la pièce, même avec les bons prénoms', async () => {
    const alerteTardive = { ...alertePerte, createdAt: new Date('2026-01-05T00:00:00Z') } as AlertePerte;
    const { service } = monter(creerCorrespondance({ alertePerte: alerteTardive }), demandeur);

    const [vue] = await service.findByTelephone(demandeur.telephone);
    expect(vue.defiRequis).toBe(true);
    await expect(service.confirmer('corr-1', demandeur.telephone)).rejects.toThrow(ForbiddenException);

    const apres = await service.repondreDefi('corr-1', demandeur.telephone, 'Issa');
    expect(apres.defiRequis).toBe(false);
  });

  it('ne donne au demandeur ni score ni niveau, qui trahissaient le prénom et le lieu', async () => {
    const { service } = monter(creerCorrespondance(), demandeur);
    const [vue] = await service.findByTelephone(demandeur.telephone);
    expect(vue.score).toBeNull();
    expect(vue.niveauConfiance).toBeNull();
  });

  it('ne donne pas davantage le score au trouveur, que rien ne vérifie', async () => {
    const { service } = monter(creerCorrespondance(), trouveur);
    const [vue] = await service.findByTelephone(trouveur.telephone);
    expect(vue.score).toBeNull();
    expect(vue.niveauConfiance).toBeNull();
  });

  /**
   * Des alertes semées d'avance au même nom, chacune avec un prénom différent :
   * à la publication, chaque clic sur « C'est ma pièce » est un essai compté.
   */
  it('compte un seul essai pour la confirmation d’une alerte antérieure aux prénoms faux, puis pose la question', async () => {
    const defis = new DefisService();
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), demandeur, defis);

    const [avant] = await service.findByTelephone(demandeur.telephone);
    expect(avant.defiRequis).toBe(false);

    for (let i = 0; i < 5; i++) {
      await expect(service.confirmer('corr-1', demandeur.telephone)).rejects.toThrow(ForbiddenException);
    }
    const [apres] = await service.findByTelephone(demandeur.telephone);
    expect(apres.defiRequis).toBe(true);

    // Un seul échec compté : il reste deux essais pour la question.
    await expect(service.repondreDefi('corr-1', demandeur.telephone, 'Ibrahim')).rejects.toThrow(
      BadRequestException,
    );
    const reussi = await service.repondreDefi('corr-1', demandeur.telephone, 'Issa');
    expect(reussi.defiRequis).toBe(false);
  });

  it('ne montre au trouveur que le nom et les initiales de l’alerte, sans quartier, avant la confirmation', async () => {
    const alerte = { ...alertePerte, quartier: 'Riviera 2' } as AlertePerte;
    const { service } = monter(creerCorrespondance({ alertePerte: alerte }), trouveur);
    const [vue] = await service.findByTelephone(trouveur.telephone);
    expect(vue.alertePerte.prenom).toBe('I.');
    expect(vue.alertePerte.nom).toBe('BAMBA');
    expect(vue.alertePerte.quartier).toBeNull();
  });

  it('compte double une réponse fausse qui propose un prénom de plus', async () => {
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), demandeur);
    // Pièce « Issa » : « Ibrahim Idrissa » teste deux prénoms à la fois.
    await expect(
      service.repondreDefi('corr-1', demandeur.telephone, 'Ibrahim Idrissa'),
    ).rejects.toThrow(BadRequestException);
    await expect(service.repondreDefi('corr-1', demandeur.telephone, 'Ismaël Moussa')).rejects.toThrow(
      BadRequestException,
    );
    const erreur = await service.repondreDefi('corr-1', demandeur.telephone, 'Issa').catch((e) => e);
    expect((erreur as HttpException).getStatus()).toBe(429);
  });

  it('annonce « demain » quand c’est la pièce qui est fermée', async () => {
    const defis = new DefisService();
    for (let i = 0; i < 10; i++) defis.echec('piece-1', `07000000${String(i).padStart(2, '0')}`);
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), demandeur, defis);

    await expect(service.repondreDefi('corr-1', demandeur.telephone, 'Issa')).rejects.toThrow(
      'Trop d’essais sur cette pièce. Réessaie demain.',
    );
  });

  it('ne pose jamais la question au trouveur', async () => {
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), trouveur);
    const resultat = await service.confirmer('corr-1', trouveur.telephone);
    expect(resultat.confirmeParMoi).toBe(true);
    expect(resultat.defiRequis).toBe(false);
  });

  it('répond « Ça ne correspond pas. » à une réponse fausse, sans rien écrire', async () => {
    const { service, correspondances } = monter(
      creerCorrespondance({ alertePerte: alerteInventee }),
      demandeur,
    );

    await expect(service.repondreDefi('corr-1', demandeur.telephone, 'Ibrahim')).rejects.toThrow(
      'Ça ne correspond pas.',
    );
    expect(correspondances.save).not.toHaveBeenCalled();
  });

  it('bloque après trois réponses fausses, même avec la bonne ensuite', async () => {
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), demandeur);

    for (const essai of ['Ibrahim', 'Idrissa', 'Ismaël']) {
      await expect(service.repondreDefi('corr-1', demandeur.telephone, essai)).rejects.toThrow(
        BadRequestException,
      );
    }
    const erreur = await service.repondreDefi('corr-1', demandeur.telephone, 'Issa').catch((e) => e);
    expect(erreur).toBeInstanceOf(HttpException);
    expect((erreur as HttpException).getStatus()).toBe(429);
  });

  it('retient une bonne réponse, puis laisse confirmer', async () => {
    const correspondance = creerCorrespondance({ alertePerte: alerteInventee });
    const { service, correspondances } = monter(correspondance, demandeur);

    const apres = await service.repondreDefi('corr-1', demandeur.telephone, 'issa');
    expect(apres.defiRequis).toBe(false);
    expect(correspondances.save).toHaveBeenCalledWith(
      expect.objectContaining({ defiReussiLe: expect.any(Date) }),
    );

    const confirme = await service.confirmer('corr-1', demandeur.telephone);
    expect(confirme.confirmeParMoi).toBe(true);
  });

  it('refuse que le trouveur réponde à la place du demandeur', async () => {
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), trouveur);
    await expect(service.repondreDefi('corr-1', trouveur.telephone, 'Issa')).rejects.toThrow(
      ForbiddenException,
    );
  });

  /**
   * Sans ce masque, la liste des correspondances donnait au demandeur le
   * prénom complet de la pièce — la réponse du défi, avant la question.
   */
  it('ne montre au demandeur que les initiales du prénom de la pièce', async () => {
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), demandeur);
    const [vue] = await service.findByTelephone(demandeur.telephone);

    expect(vue.pieceTrouvee.prenom).toBe('I.');
    expect(vue.pieceTrouvee.nom).toBe('BAMBA');
    expect(JSON.stringify(vue.pieceTrouvee)).not.toContain('Issa');
    // Alerte antérieure : pas de question affichée d'avance, qui dirait si ses
    // prénoms sont les bons ; ils sont vérifiés, et comptés, au clic.
    expect(vue.defiRequis).toBe(false);
  });

  it('montre au trouveur ce qu’il a lui-même déclaré', async () => {
    const { service } = monter(creerCorrespondance({ alertePerte: alerteInventee }), trouveur);
    const [vue] = await service.findByTelephone(trouveur.telephone);
    expect(vue.pieceTrouvee.prenom).toBe('Issa');
  });

  it('ne pose pas la question quand la pièce n’a pas de prénom renseigné', async () => {
    const sansPrenom = { ...pieceTrouvee, prenom: '  ' } as PieceTrouvee;
    const { service } = monter(
      creerCorrespondance({ pieceTrouvee: sansPrenom, alertePerte: alerteInventee }),
      demandeur,
    );
    const resultat = await service.confirmer('corr-1', demandeur.telephone);
    expect(resultat.confirmeParMoi).toBe(true);
  });
});
