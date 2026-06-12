import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
} as PieceTrouvee;

const alertePerte = {
  id: 'alerte-1',
  typePiece: TypePiece.CNI,
  prenom: 'Issa',
  nom: 'Bamba',
  commune: 'Cocody',
  utilisateur: demandeur,
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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

    await expect(service.confirmer('corr-1', '+2250700009999')).rejects.toThrow(NotFoundException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it("rejette avec NotFoundException si la correspondance n'existe pas", async () => {
    const correspondances = creerCorrespondancesRepoMock({ correspondance: null });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [trouveur.telephone]: trouveur });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

    await expect(service.confirmer('corr-x', trouveur.telephone)).rejects.toThrow(NotFoundException);
    expect(correspondances.save).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it("rejette avec ForbiddenException si l'utilisateur n'est pas partie à la correspondance", async () => {
    const correspondances = creerCorrespondancesRepoMock({ correspondance: creerCorrespondance() });
    const journal = creerJournalRepoMock();
    const utilisateurs = creerUtilisateursServiceMock({ [tiers.telephone]: tiers });
    const notifications = creerNotificationsMock();
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

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
    const service = new CorrespondancesService(correspondances, journal, utilisateurs, notifications);

    const resultat = await service.findByTelephone(demandeur.telephone);

    expect(resultat[0].confirmeParMoi).toBe(false);
    expect(resultat[0].confirmeParAutre).toBe(true);
  });
});
