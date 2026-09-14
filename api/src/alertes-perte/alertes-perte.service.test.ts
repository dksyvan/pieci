import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { TypePiece } from '../common/enums';
import { AlertePerte } from './entities/alerte-perte.entity';
import { AlertesPerteService } from './alertes-perte.service';
import type { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import type { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import type { MatchingService } from '../matching/matching.service';

function creerMatchingMock(): MatchingService {
  return {
    traiterNouvellePiece: vi.fn(async () => undefined),
    traiterNouvelleAlerte: vi.fn(async () => undefined),
  } as unknown as MatchingService;
}

describe('AlertesPerteService.create', () => {
  it('résout l’utilisateur et enregistre la position en GeoJSON quand lat/lng sont fournis', async () => {
    const utilisateur = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = {
      findOrCreate: vi.fn(async () => utilisateur),
    } as unknown as UtilisateursService;

    const create = vi.fn((p: Partial<AlertePerte>) => p as AlertePerte);
    const save = vi.fn(async (p: AlertePerte) => ({ id: 'alerte-1', ...p }) as AlertePerte);
    const find = vi.fn(async () => [] as AlertePerte[]);
    const repo = { create, save, find } as unknown as Repository<AlertePerte>;

    const matching = creerMatchingMock();
    const service = new AlertesPerteService(repo, utilisateurs, matching);

    await service.create({
      utilisateur: { telephone: '+2250700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: TypePiece.CNI,
      prenom: 'Awa',
      nom: 'Koné',
      commune: 'Cocody',
      lat: 5.345,
      lng: -3.978,
    });

    expect(matching.traiterNouvelleAlerte).toHaveBeenCalledWith('alerte-1');
    expect(utilisateurs.findOrCreate).toHaveBeenCalledWith({
      telephone: '+2250700000000',
      prenom: 'Awa',
      nom: 'Koné',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateur,
        position: { type: 'Point', coordinates: [-3.978, 5.345] },
        commune: 'Cocody',
      }),
    );
    expect(save).toHaveBeenCalled();
  });

  it('laisse position et commune à null quand ils ne sont pas fournis', async () => {
    const utilisateur = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = {
      findOrCreate: vi.fn(async () => utilisateur),
    } as unknown as UtilisateursService;

    const create = vi.fn((p: Partial<AlertePerte>) => p as AlertePerte);
    const save = vi.fn(async (p: AlertePerte) => ({ id: 'alerte-1', ...p }) as AlertePerte);
    const find = vi.fn(async () => [] as AlertePerte[]);
    const repo = { create, save, find } as unknown as Repository<AlertePerte>;

    const service = new AlertesPerteService(repo, utilisateurs, creerMatchingMock());

    await service.create({
      utilisateur: { telephone: '+2250700000000', prenom: 'Awa', nom: 'Koné' },
      typePiece: TypePiece.CNI,
      prenom: 'Awa',
      nom: 'Koné',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ position: null, commune: null }),
    );
  });
});

describe('AlertesPerteService.findByTelephone', () => {
  it('filtre par téléphone de l’utilisateur, du plus récent au plus ancien', async () => {
    const find = vi.fn(async () => []);
    const repo = { find } as unknown as Repository<AlertePerte>;
    const utilisateurs = {} as UtilisateursService;

    const service = new AlertesPerteService(repo, utilisateurs, creerMatchingMock());
    await service.findByTelephone('+2250700000000');

    expect(find).toHaveBeenCalledWith({
      where: { utilisateur: { telephone: '+2250700000000' } },
      order: { createdAt: 'DESC' },
    });
  });

  it('met à jour l’alerte existante de la même personne, même nom et même type, sans relancer le rapprochement', async () => {
    const utilisateur = { id: 'user-1', telephone: '+2250700000000' } as Utilisateur;
    const utilisateurs = { findOrCreate: vi.fn(async () => utilisateur) } as unknown as UtilisateursService;

    const existante = { id: 'alerte-1', nom: "N'Guessan", prenom: 'Adjoua', commune: null } as AlertePerte;
    const find = vi.fn(async () => [existante]);
    const create = vi.fn();
    const save = vi.fn(async (p: AlertePerte) => p);
    const repo = { create, save, find } as unknown as Repository<AlertePerte>;
    const matching = creerMatchingMock();
    const service = new AlertesPerteService(repo, utilisateurs, matching);

    const resultat = await service.create({
      utilisateur: { telephone: '+2250700000000', prenom: 'Adjoua', nom: 'N’GUESSAN' },
      typePiece: TypePiece.CNI,
      prenom: 'Adjoua Marie-Laure',
      nom: 'N’GUESSAN',
    });

    expect(resultat.id).toBe('alerte-1');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ prenom: 'Adjoua Marie-Laure' }));
    expect(create).not.toHaveBeenCalled();
    expect(matching.traiterNouvelleAlerte).not.toHaveBeenCalled();
  });
});
