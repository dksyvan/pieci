import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { TelephoneDto } from '../common/dto/telephone.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMine(@Query() query: TelephoneDto) {
    return this.notifications.findByTelephone(query.telephone);
  }

  @Post(':id/lue')
  marquerLue(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.notifications.marquerLue(id, dto.telephone);
  }
}
