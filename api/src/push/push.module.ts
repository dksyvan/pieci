import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, ExpoPushToken])],
  providers: [PushService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}
