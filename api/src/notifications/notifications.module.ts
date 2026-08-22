import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MessagerieModule } from '../messagerie/messagerie.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Utilisateur]), MessagerieModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
