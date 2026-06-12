import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Correspondance } from '../correspondances/entities/correspondance.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchingService } from './matching.service';

@Module({
  imports: [TypeOrmModule.forFeature([Correspondance]), NotificationsModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
