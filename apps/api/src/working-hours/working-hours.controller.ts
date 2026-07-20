import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('working-hours')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  async findByProfessional(@Query('professionalId') professionalId: string) {
    return this.workingHoursService.findByProfessional(professionalId);
  }

  @Post()
  @Roles('owner', 'admin')
  async create(@Body() dto: CreateWorkingHoursDto) {
    return this.workingHoursService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  async update(@Param('id') id: string, @Body() dto: UpdateWorkingHoursDto) {
    return this.workingHoursService.update(id, dto);
  }

  @Post('bulk')
  @Roles('owner', 'admin')
  async createBulk(
    @CurrentUser() user: RequestUser,
    @Body() body: { entries: Array<{ weekday: number; startTime: string; endTime: string }> },
  ) {
    return this.workingHoursService.createBulk(user.userId, body.entries);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(@Param('id') id: string) {
    return this.workingHoursService.remove(id);
  }
}
