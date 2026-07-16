import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { UpsertCustomizationDto } from './dto/upsert-customization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Get()
  async findByBusiness() {
    return this.customizationService.findByBusiness();
  }

  @Put()
  @Roles('owner', 'admin')
  async upsert(@Body() dto: UpsertCustomizationDto) {
    return this.customizationService.upsert(dto);
  }
}
