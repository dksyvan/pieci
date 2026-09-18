import { Module } from '@nestjs/common';
import { ReperesController } from './reperes.controller';
import { ReperesService } from './reperes.service';

@Module({ controllers: [ReperesController], providers: [ReperesService] })
export class ReperesModule {}
