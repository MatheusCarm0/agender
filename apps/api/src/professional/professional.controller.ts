import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('professionals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) {}

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.professionalService.findAll(user.businessId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.professionalService.findById(user.businessId, id);
  }

  @Post()
  @Roles('owner', 'admin')
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateProfessionalDto,
  ) {
    return this.professionalService.create(user.businessId, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.professionalService.remove(user.businessId, id);
  }
}
