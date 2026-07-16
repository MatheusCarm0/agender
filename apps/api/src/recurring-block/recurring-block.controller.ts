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
import { RecurringBlockService } from './recurring-block.service';
import { CreateRecurringBlockDto } from './dto/create-recurring-block.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('recurring-blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecurringBlockController {
  constructor(private readonly recurringBlockService: RecurringBlockService) {}

  @Get()
  async findAll(@Query('professionalId') professionalId?: string) {
    return this.recurringBlockService.findAll(professionalId);
  }

  @Post()
  @Roles('owner', 'admin', 'professional')
  async create(@Body() dto: CreateRecurringBlockDto) {
    return this.recurringBlockService.create(dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'professional')
  async remove(@Param('id') id: string) {
    return this.recurringBlockService.remove(id);
  }
}
