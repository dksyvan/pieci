import { describe, expect, it, vi } from 'vitest';
import type { DataSource, Repository } from 'typeorm';
import { TypePiece } from '../common/enums';
import { Correspondance } from '../correspondances/entities/correspondance.entity';
import { Notification } from '../notifications/entities/notification.entity';
import type { NotificationsService } from '../notifications/notifications.service';
import { MatchingService } from './matching.service';

function creerCorrespondancesRepoMock() {
  const upsert = vi.fn(async () => ({}) as any);
  const findOne = vi.fn(async () => ({ id: 'corr-1' }) as Correspondance);
  return { upsert, findOne } as unknown as Repository<Correspondance>;
}

function creerNotificationsMock() {
  const creer = vi.fn(async () => ({}) as Notification);
  return { creer } as unknown as NotificationsService;
}

describe('MatchingService.traiterNouvelleAlerte', () => {
  it('calcule les correspondances, les enregistre par upsert et notifie les deux parties', async () => {
    const alerteRow = {
      id: 'alerte-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      created_at: new Date('2026-01-01'),
      utilisateur_id: 'user-demandeur',
      lat: 5.345,
      lng: -3.978,
    };
    const candidatRow = {
      id: 'piece-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      date_trouvaille: new Date('2026-01-01'),
      declarant_id: 'user-trouveur',
      lat: 5.345,
      lng: -3.978,
    };

    const query = vi.fn().mockResolvedValueOnce([alerteRow]).mockResolvedValueOnce([candidatRow]);
    const dataSource = { query } as unknown as DataSource;

    const repo = creerCorrespondancesRepoMock();
    const notifications = creerNotificationsMock();

    const service = new MatchingService(repo, dataSource, notifications);
    await service.traiterNouvelleAlerte('alerte-1');

    expect(repo.upsert).toHaveBeenCalledTimes(1);
    const [paires, options] = (repo.upsert as any).mock.calls[0];
    expect(options).toEqual({ conflictPaths: ['pieceTrouvee', 'alertePerte'] });
    expect(paires).toHaveLength(1);
    expect(paires[0].pieceTrouvee).toEqual({ id: 'piece-1' });
    expect(paires[0].alertePerte).toEqual({ id: 'alerte-1' });
    expect(paires[0].score).toBeCloseTo(1, 10);
    expect(paires[0].niveauConfiance).toBe('forte');

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { pieceTrouvee: { id: 'piece-1' }, alertePerte: { id: 'alerte-1' } },
    });
    expect(notifications.creer).toHaveBeenCalledTimes(2);
    expect(notifications.creer).toHaveBeenCalledWith({
      utilisateurId: 'user-trouveur',
      titre: 'Correspondance trouvée',
      contenu: expect.any(String),
      correspondanceId: 'corr-1',
    });
    expect(notifications.creer).toHaveBeenCalledWith({
      utilisateurId: 'user-demandeur',
      titre: 'Correspondance trouvée',
      contenu: expect.any(String),
      correspondanceId: 'corr-1',
    });
  });

  /**
   * Le lieu est facultatif sur « j'ai perdu ma piece » — on ne sait pas
   * toujours ou on l'a perdue. Ces alertes etaient abandonnees en silence :
   * la personne lisait « ton alerte est enregistree, on te previent » et
   * n'etait jamais prevenue, meme pour une piece declaree le lendemain a son
   * nom exact. Trois alertes reelles etaient dans cet etat en production.
   */
  it("apparie une alerte sans position, sans borne geographique", async () => {
    const alerteRow = {
      id: 'alerte-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      created_at: new Date('2026-01-01'),
      utilisateur_id: 'user-demandeur',
      lat: null,
      lng: null,
    };
    const candidatRow = {
      id: 'piece-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      date_trouvaille: new Date('2026-01-01'),
      declarant_id: 'user-trouveur',
      lat: 5.345,
      lng: -3.978,
    };

    const query = vi.fn().mockResolvedValueOnce([alerteRow]).mockResolvedValueOnce([candidatRow]);
    const dataSource = { query } as unknown as DataSource;

    const repo = creerCorrespondancesRepoMock();
    const notifications = creerNotificationsMock();

    const service = new MatchingService(repo, dataSource, notifications);
    await service.traiterNouvelleAlerte('alerte-1');

    // La requete des candidats renonce a ST_DWithin plutot qu'au rapprochement.
    const [sqlCandidats, parametres] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlCandidats).not.toContain('ST_DWithin');
    expect(parametres).toHaveLength(2);

    // Identite et type pesent 0,85 a eux seuls : bien au-dessus du seuil.
    expect(repo.upsert).toHaveBeenCalled();
    expect(notifications.creer).toHaveBeenCalledTimes(2);
  });

  it("n'enregistre rien si aucun candidat ne dépasse le seuil d'affichage", async () => {
    const alerteRow = {
      id: 'alerte-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      created_at: new Date('2026-01-01'),
      utilisateur_id: 'user-demandeur',
      lat: 5.345,
      lng: -3.978,
    };

    const query = vi.fn().mockResolvedValueOnce([alerteRow]).mockResolvedValueOnce([]);
    const dataSource = { query } as unknown as DataSource;

    const repo = creerCorrespondancesRepoMock();
    const notifications = creerNotificationsMock();

    const service = new MatchingService(repo, dataSource, notifications);
    await service.traiterNouvelleAlerte('alerte-1');

    expect(repo.upsert).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });
});

describe('MatchingService.traiterNouvellePiece', () => {
  it('calcule les correspondances symétriquement et notifie les deux parties', async () => {
    const pieceRow = {
      id: 'piece-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      date_trouvaille: new Date('2026-01-01'),
      declarant_id: 'user-trouveur',
      lat: 5.345,
      lng: -3.978,
    };
    const candidatRow = {
      id: 'alerte-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      created_at: new Date('2026-01-01'),
      utilisateur_id: 'user-demandeur',
      lat: 5.345,
      lng: -3.978,
    };

    const query = vi.fn().mockResolvedValueOnce([pieceRow]).mockResolvedValueOnce([candidatRow]);
    const dataSource = { query } as unknown as DataSource;

    const repo = creerCorrespondancesRepoMock();
    const notifications = creerNotificationsMock();

    const service = new MatchingService(repo, dataSource, notifications);
    await service.traiterNouvellePiece('piece-1');

    expect(repo.upsert).toHaveBeenCalledTimes(1);
    const [paires] = (repo.upsert as any).mock.calls[0];
    expect(paires[0].pieceTrouvee).toEqual({ id: 'piece-1' });
    expect(paires[0].alertePerte).toEqual({ id: 'alerte-1' });
    expect(paires[0].score).toBeCloseTo(1, 10);
    expect(paires[0].niveauConfiance).toBe('forte');

    expect(notifications.creer).toHaveBeenCalledTimes(2);
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: 'user-trouveur', correspondanceId: 'corr-1' }),
    );
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: 'user-demandeur', correspondanceId: 'corr-1' }),
    );
  });

  /**
   * Symetrique du precedent, et le cas que l'utilisateur a demande de
   * garantir : Kone declare sa perte sans preciser le lieu, Koffi declare la
   * trouvaille deux jours plus tard, Kone doit etre prevenu.
   */
  it("retient les alertes sans position quand une piece est declaree", async () => {
    const pieceRow = {
      id: 'piece-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      date_trouvaille: new Date('2026-01-03'),
      declarant_id: 'user-trouveur',
      lat: 5.345,
      lng: -3.978,
    };
    const alerteRow = {
      id: 'alerte-1',
      prenom: 'Awa',
      nom: 'Koné',
      type_piece: TypePiece.CNI,
      created_at: new Date('2026-01-01'),
      utilisateur_id: 'user-demandeur',
      lat: null,
      lng: null,
    };

    const query = vi.fn().mockResolvedValueOnce([pieceRow]).mockResolvedValueOnce([alerteRow]);
    const dataSource = { query } as unknown as DataSource;

    const repo = creerCorrespondancesRepoMock();
    const notifications = creerNotificationsMock();

    const service = new MatchingService(repo, dataSource, notifications);
    await service.traiterNouvellePiece('piece-1');

    // La clause qui excluait ces alertes ne doit pas revenir.
    const [sqlCandidats] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlCandidats).not.toContain('position IS NOT NULL');
    expect(sqlCandidats).toContain('position IS NULL');

    expect(repo.upsert).toHaveBeenCalled();
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: 'user-demandeur' }),
    );
  });

  it('ne fait rien si la pièce est introuvable', async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const dataSource = { query } as unknown as DataSource;

    const repo = creerCorrespondancesRepoMock();
    const notifications = creerNotificationsMock();

    const service = new MatchingService(repo, dataSource, notifications);
    await service.traiterNouvellePiece('piece-inconnue');

    expect(query).toHaveBeenCalledTimes(1);
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(notifications.creer).not.toHaveBeenCalled();
  });
});
