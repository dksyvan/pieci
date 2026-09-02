import { describe, expect, it, vi } from 'vitest';
import type { DataSource, Repository } from 'typeorm';
import { TypePiece } from '../common/enums';
import { PieceTrouvee } from './entities/piece-trouvee.entity';
import { PiecesTrouveesService } from './pieces-trouvees.service';
import type { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import type { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import type { MatchingService } from '../matching/matching.service';

function creerMatchingMock(): MatchingService {
  return {
    traiterNouvellePiece: vi.fn(async () => undefined),
    traiterNouvelleAlerte: vi.fn(async () => undefined),
  } as unknown as MatchingService;
}

describe('PiecesTrouveesService.create', () => {
  it('résout le déclarant et enregistre la position en GeoJSON', async () => {
    const declarant = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = {
      findOrCreate: vi.fn(async () => declarant),
    } as unknown as UtilisateursService;

    const create = vi.fn((p: Partial<PieceTrouvee>) => p as PieceTrouvee);
    const save = vi.fn(async (p: PieceTrouvee) => ({ id: 'piece-1', ...p }) as PieceTrouvee);
    const repo = { create, save } as unknown as Repository<PieceTrouvee>;
    const dataSource = {} as DataSource;

    const matching = creerMatchingMock();
    const service = new PiecesTrouveesService(repo, dataSource, utilisateurs, matching);

    await service.create({
      declarant: { telephone: '+2250700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: TypePiece.CNI,
      prenom: 'Mariam',
      nom: 'Traoré',
      commune: 'Cocody',
      lat: 5.345,
      lng: -3.978,
    });

    expect(matching.traiterNouvellePiece).toHaveBeenCalledWith('piece-1');
    expect(utilisateurs.findOrCreate).toHaveBeenCalledWith({
      telephone: '+2250700000000',
      prenom: 'Awa',
      nom: 'Koné',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        declarant,
        position: { type: 'Point', coordinates: [-3.978, 5.345] },
        pointDepot: null,
      }),
    );
    expect(save).toHaveBeenCalled();
  });

  it('référence le point de dépôt par id sans le charger', async () => {
    const declarant = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = {
      findOrCreate: vi.fn(async () => declarant),
    } as unknown as UtilisateursService;

    const create = vi.fn((p: Partial<PieceTrouvee>) => p as PieceTrouvee);
    const save = vi.fn(async (p: PieceTrouvee) => ({ id: 'piece-1', ...p }) as PieceTrouvee);
    const repo = { create, save } as unknown as Repository<PieceTrouvee>;
    const dataSource = {} as DataSource;

    const service = new PiecesTrouveesService(repo, dataSource, utilisateurs, creerMatchingMock());

    await service.create({
      declarant: { telephone: '+2250700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: TypePiece.CNI,
      prenom: 'Mariam',
      nom: 'Traoré',
      commune: 'Cocody',
      lat: 5.345,
      lng: -3.978,
      pointDepotId: 'depot-1',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ pointDepot: { id: 'depot-1' } }),
    );
  });
});

describe('PiecesTrouveesService.findPublic', () => {
  it('interroge la vue publique v_pieces_trouvees_publiques', async () => {
    const query = vi.fn(async () => []);
    const dataSource = { query } as unknown as DataSource;
    const repo = {} as Repository<PieceTrouvee>;
    const utilisateurs = {} as UtilisateursService;

    const service = new PiecesTrouveesService(repo, dataSource, utilisateurs, creerMatchingMock());
    await service.findPublic();

    expect(query).toHaveBeenCalledWith(expect.stringContaining('v_pieces_trouvees_publiques'));
  });
});

describe('PiecesTrouveesService.stats', () => {
  it('agrege les comptes par commune, par type, et en tout', async () => {
    const query = vi.fn(async () => [
      { commune: 'Yopougon', type_piece: 'CNI', n: '3' },
      { commune: 'Yopougon', type_piece: 'Passeport', n: '1' },
      { commune: 'Cocody', type_piece: 'CNI', n: '2' },
    ]);
    const service = new PiecesTrouveesService(
      {} as Repository<PieceTrouvee>,
      { query } as unknown as DataSource,
      {} as UtilisateursService,
      creerMatchingMock(),
    );

    const stats = await service.stats();

    // COUNT() arrive en chaine depuis Postgres : le total prouve la conversion.
    expect(stats.total).toBe(6);
    expect(stats.parCommune).toEqual({ Yopougon: 4, Cocody: 2 });
    expect(stats.parType).toEqual({ CNI: 5, Passeport: 1 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('v_pieces_trouvees_publiques'));
  });

  it('rend des agregats vides quand le registre est vide', async () => {
    const service = new PiecesTrouveesService(
      {} as Repository<PieceTrouvee>,
      { query: vi.fn(async () => []) } as unknown as DataSource,
      {} as UtilisateursService,
      creerMatchingMock(),
    );

    await expect(service.stats()).resolves.toEqual({ total: 0, parCommune: {}, parType: {} });
  });
});

describe('PiecesTrouveesService.findOnePublic', () => {
  function creerService(lignes: unknown[]) {
    const query = vi.fn(async () => lignes);
    const service = new PiecesTrouveesService(
      {} as Repository<PieceTrouvee>,
      { query } as unknown as DataSource,
      {} as UtilisateursService,
      creerMatchingMock(),
    );
    return { service, query };
  }

  it('lit la vue publique, jamais la table', async () => {
    const ligne = { id: 'piece-1', prenom: 'Adjoua', nom_initiale: 'N', commune: 'Yopougon' };
    const { service, query } = creerService([ligne]);

    await expect(service.findOnePublic('piece-1')).resolves.toBe(ligne);

    // La vue est ce qui garantit qu'aucun nom entier ni contact ne sort d'ici.
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('v_pieces_trouvees_publiques'),
      ['piece-1'],
    );
  });

  it('passe l’identifiant en parametre, sans le concatener', async () => {
    const { service, query } = creerService([{ id: 'x' }]);

    await service.findOnePublic("' OR 1=1 --");

    const [sql, parametres] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toContain('OR 1=1');
    expect(parametres).toEqual(["' OR 1=1 --"]);
  });

  it('refuse une piece absente de la vue plutot que de rendre du vide', async () => {
    // Restituee, expiree ou jamais existante : de l'exterieur, c'est pareil.
    // Un lien partage il y a trois mois doit cesser de repondre, pas afficher
    // une fiche a moitie vide.
    const { service } = creerService([]);
    await expect(service.findOnePublic('inconnue')).rejects.toThrow(/registre/);
  });
});
