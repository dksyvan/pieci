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
