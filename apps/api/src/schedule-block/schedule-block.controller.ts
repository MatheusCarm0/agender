import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleBlockService } from './schedule-block.service';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('schedule-blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleBlockController {
  constructor(private readonly scheduleBlockService: ScheduleBlockService) {}

  @Get()
  async findAll(@Query('professionalId') professionalId?: string) {
    return this.scheduleBlockService.findAll(professionalId);
  }

  @Post()
  @Roles('owner', 'admin', 'professional')
  async create(@Body() dto: CreateScheduleBlockDto) {
    return this.scheduleBlockService.create(dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'professional')
  async remove(@Param('id') id: string) {
    return this.scheduleBlockService.remove(id);
  }
}
