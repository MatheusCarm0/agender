import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.appointmentService.findAll(user.role, user.userId);
  }

  @Post()
  @Roles('owner', 'admin', 'receptionist')
  async create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'professional')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.updateStatus(id, dto);
  }

  @Patch(':id/payment')
  @Roles('owner', 'admin', 'receptionist')
  async updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.appointmentService.updatePayment(id, dto);
  }
}
