import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { UtilisateursService } from './utilisateurs.service';

function creerRepoMock(existant: Utilisateur | null) {
  const findOne = vi.fn(async () => existant);
  const create = vi.fn((u: Partial<Utilisateur>) => u as Utilisateur);
  const save = vi.fn(async (u: Utilisateur) => ({ id: 'nouveau-id', ...u }) as Utilisateur);
  return { findOne, create, save } as unknown as Repository<Utilisateur>;
}

describe('UtilisateursService.findOrCreate', () => {
  it("retourne l'utilisateur existant sans créer de doublon", async () => {
    const existant = { id: '1', telephone: '+2250700000000' } as Utilisateur;
    const repo = creerRepoMock(existant);
    const service = new UtilisateursService(repo);

    const resultat = await service.findOrCreate({
      telephone: '+2250700000000',
      prenom: 'Awa',
      nom: 'Koné',
    });

    expect(resultat).toBe(existant);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { telephone: '+2250700000000' } });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('crée un nouvel utilisateur quand le téléphone est inconnu', async () => {
    const repo = creerRepoMock(null);
    const service = new UtilisateursService(repo);

    const resultat = await service.findOrCreate({
      telephone: '+2250700000001',
      prenom: 'Issa',
      nom: 'Bamba',
      email: 'issa@example.com',
    });

    expect(repo.create).toHaveBeenCalledWith({
      telephone: '+2250700000001',
      prenom: 'Issa',
      nom: 'Bamba',
      email: 'issa@example.com',
    });
    expect(repo.save).toHaveBeenCalled();
    expect(resultat.telephone).toBe('+2250700000001');
  });

  it('utilise null (et non undefined) quand aucun email n’est fourni', async () => {
    const repo = creerRepoMock(null);
    const service = new UtilisateursService(repo);

    await service.findOrCreate({
      telephone: '+2250700000002',
      prenom: 'Fatou',
      nom: 'Diabaté',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: null }),
    );
  });
});

describe('UtilisateursService.findByTelephone', () => {
  it('retourne null sans créer si le téléphone est inconnu', async () => {
    const repo = creerRepoMock(null);
    const service = new UtilisateursService(repo);

    const resultat = await service.findByTelephone('+2250700000099');

    expect(resultat).toBeNull();
    expect(repo.findOne).toHaveBeenCalledWith({ where: { telephone: '+2250700000099' } });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("retourne l'utilisateur trouvé", async () => {
    const existant = { id: '1', telephone: '+2250700000000' } as Utilisateur;
    const repo = creerRepoMock(existant);
    const service = new UtilisateursService(repo);

    const resultat = await service.findByTelephone('+2250700000000');

    expect(resultat).toBe(existant);
  });
});
