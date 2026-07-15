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

@Controller('professionals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) {}

  @Get()
  async findAll() {
    return this.professionalService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.professionalService.findById(id);
  }

  @Post()
  @Roles('owner', 'admin')
  async create(@Body() dto: CreateProfessionalDto) {
    return this.professionalService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessionalDto) {
    return this.professionalService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(@Param('id') id: string) {
    return this.professionalService.remove(id);
  }
}
