import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Correspondance } from './entities/correspondance.entity';
import { JournalAccesContact } from '../journal-acces-contact/entities/journal-acces-contact.entity';
import { CorrespondancesService } from './correspondances.service';
import { CorrespondancesController } from './correspondances.controller';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Correspondance, JournalAccesContact]),
    UtilisateursModule,
    NotificationsModule,
  ],
  providers: [CorrespondancesService],
  controllers: [CorrespondancesController],
})
export class CorrespondancesModule {}
