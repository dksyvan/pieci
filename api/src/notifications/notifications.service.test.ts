import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

function creerRepoMock(notification: Notification | null = null) {
  const create = vi.fn((n: Partial<Notification>) => n as Notification);
  const save = vi.fn(async (n: Notification) => n);
  const find = vi.fn(async () => (notification ? [notification] : []));
  const findOne = vi.fn(async () => notification);
  return { create, save, find, findOne } as unknown as Repository<Notification>;
}

describe('NotificationsService.creer', () => {
  it('crée une notification liée à une correspondance via des références partielles', async () => {
    const repo = creerRepoMock();
    const service = new NotificationsService(repo);

    await service.creer({
      utilisateurId: 'user-1',
      titre: 'Correspondance trouvée',
      contenu: 'Une correspondance potentielle a été trouvée.',
      correspondanceId: 'corr-1',
    });

    expect(repo.create).toHaveBeenCalledWith({
      utilisateur: { id: 'user-1' },
      correspondance: { id: 'corr-1' },
      titre: 'Correspondance trouvée',
      contenu: 'Une correspondance potentielle a été trouvée.',
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('utilise null quand aucune correspondance n’est associée', async () => {
    const repo = creerRepoMock();
    const service = new NotificationsService(repo);

    await service.creer({
      utilisateurId: 'user-1',
      titre: 'Bienvenue',
      contenu: 'Votre compte a été créé.',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ correspondance: null }),
    );
  });
});

describe('NotificationsService.findByTelephone', () => {
  it("interroge les notifications de l'utilisateur, triées par date décroissante", async () => {
    const notification = { id: 'notif-1', titre: 'X', contenu: 'Y', lu: false } as Notification;
    const repo = creerRepoMock(notification);
    const service = new NotificationsService(repo);

    const resultat = await service.findByTelephone('+2250700000001');

    expect(resultat).toEqual([notification]);
    expect(repo.find).toHaveBeenCalledWith({
      where: { utilisateur: { telephone: '+2250700000001' } },
      order: { createdAt: 'DESC' },
    });
  });
});

describe('NotificationsService.marquerLue', () => {
  it("rejette avec NotFoundException si la notification n'appartient pas à ce téléphone", async () => {
    const repo = creerRepoMock(null);
    const service = new NotificationsService(repo);

    await expect(service.marquerLue('notif-1', '+2250700000001')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('marque la notification comme lue', async () => {
    const notification = { id: 'notif-1', titre: 'X', contenu: 'Y', lu: false } as Notification;
    const repo = creerRepoMock(notification);
    const service = new NotificationsService(repo);

    const resultat = await service.marquerLue('notif-1', '+2250700000001');

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'notif-1', utilisateur: { telephone: '+2250700000001' } },
    });
    expect(resultat.lu).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ lu: true }));
  });
});
