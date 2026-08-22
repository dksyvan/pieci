import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { Correspondance } from '../correspondances/entities/correspondance.entity';
import { MessagerieService } from '../messagerie/messagerie.service';

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
    @InjectRepository(Utilisateur)
    private readonly utilisateurs: Repository<Utilisateur>,
    private readonly messagerie: MessagerieService,
  ) {}

  async creer(params: CreerNotificationParams): Promise<Notification> {
    const notification = this.notifications.create({
      utilisateur: { id: params.utilisateurId } as Utilisateur,
      correspondance: params.correspondanceId
        ? ({ id: params.correspondanceId } as Correspondance)
        : null,
      titre: params.titre,
      contenu: params.contenu,
    });
    const saved = await this.notifications.save(notification);

    /* Acheminement sans bloquer : la notification est deja en base et
       consultable dans l'onglet Suivi. Qu'aucun message ne parte n'annule
       pas la correspondance. */
    this.utilisateurs
      .findOne({ where: { id: params.utilisateurId }, select: ['telephone'] })
      .then((u) => {
        if (u) return this.messagerie.notifier(u.telephone, params.titre, params.contenu);
      })
      .catch(() => undefined);

    return saved;
  }

  findByTelephone(telephone: string): Promise<Notification[]> {
    return this.notifications.find({
      where: { utilisateur: { telephone } },
      order: { createdAt: 'DESC' },
    });
  }

  async marquerLue(id: string, telephone: string): Promise<Notification> {
    const notification = await this.notifications.findOne({
      where: { id, utilisateur: { telephone } },
    });
    if (!notification) throw new NotFoundException('Notification introuvable');

    notification.lu = true;
    return this.notifications.save(notification);
  }
}
