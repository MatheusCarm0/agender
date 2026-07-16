import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientService.findAll(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clientService.findById(id);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'receptionist')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }
}
