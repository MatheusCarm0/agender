import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('business')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  async findMine(@CurrentUser() user: RequestUser) {
    return this.businessService.findById(user.businessId);
  }

  @Patch()
  @Roles('owner', 'admin')
  async update(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.update(user.businessId, dto);
  }
}
