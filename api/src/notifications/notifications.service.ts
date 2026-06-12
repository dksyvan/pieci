import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { Correspondance } from '../correspondances/entities/correspondance.entity';

export interface CreerNotificationParams {
  utilisateurId: string;
  titre: string;
  contenu: string;
  correspondanceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  /** Création interne, appelée par MatchingService et CorrespondancesService. */
  creer(params: CreerNotificationParams): Promise<Notification> {
    const notification = this.notifications.create({
      utilisateur: { id: params.utilisateurId } as Utilisateur,
      correspondance: params.correspondanceId
        ? ({ id: params.correspondanceId } as Correspondance)
        : null,
      titre: params.titre,
      contenu: params.contenu,
    });
    return this.notifications.save(notification);
  }

  findByTelephone(telephone: string): Promise<Notification[]> {
    return this.notifications.find({
      where: { utilisateur: { telephone } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Marque une notification comme lue. Le filtre combiné `id` +
   * `utilisateur.telephone` renvoie 404 (et non 403) si la notification
   * appartient à quelqu'un d'autre, pour ne pas confirmer son existence.
   */
  async marquerLue(id: string, telephone: string): Promise<Notification> {
    const notification = await this.notifications.findOne({
      where: { id, utilisateur: { telephone } },
    });
    if (!notification) throw new NotFoundException('Notification introuvable');

    notification.lu = true;
    return this.notifications.save(notification);
  }
}
