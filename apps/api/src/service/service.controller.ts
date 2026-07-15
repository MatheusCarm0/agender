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
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { LinkProfessionalDto } from './dto/link-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async findAll() {
    return this.serviceService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.serviceService.findById(id);
  }

  @Post()
  @Roles('owner', 'admin')
  async create(@Body() dto: CreateServiceDto) {
    return this.serviceService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.serviceService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(@Param('id') id: string) {
    return this.serviceService.remove(id);
  }

  @Post(':id/professionals')
  @Roles('owner', 'admin')
  async linkProfessional(
    @Param('id') id: string,
    @Body() dto: LinkProfessionalDto,
  ) {
    return this.serviceService.linkProfessional(id, dto);
  }

  @Delete(':id/professionals/:professionalId')
  @Roles('owner', 'admin')
  async unlinkProfessional(
    @Param('id') id: string,
    @Param('professionalId') professionalId: string,
  ) {
    return this.serviceService.unlinkProfessional(id, professionalId);
  }
}
