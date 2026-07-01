import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ENTITIES } from './database/entities';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { PointsDepotModule } from './points-depot/points-depot.module';
import { PiecesTrouveesModule } from './pieces-trouvees/pieces-trouvees.module';
import { AlertesPerteModule } from './alertes-perte/alertes-perte.module';
import { MatchingModule } from './matching/matching.module';
import { CorrespondancesModule } from './correspondances/correspondances.module';
import { ExpirationModule } from './expiration/expiration.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: ENTITIES,
        synchronize: false,
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    UtilisateursModule,
    PointsDepotModule,
    PiecesTrouveesModule,
    AlertesPerteModule,
    MatchingModule,
    CorrespondancesModule,
    ExpirationModule,
    PushModule,
  ],
})
export class AppModule {}
