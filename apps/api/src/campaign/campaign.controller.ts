import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresPlan } from '../auth/decorators/requires-plan.decorator';
import { PLANS_WITH } from '../plan/plan-limits';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

// Campanhas são exclusivas do Pro (matriz em plan/plan-limits.ts).
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('owner', 'admin')
@RequiresPlan(...PLANS_WITH.campaigns)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  async list(@Req() req: any) {
    return this.campaignService.list(req.user.businessId);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCampaignDto) {
    return this.campaignService.create(req.user.businessId, dto);
  }

  @Post(':id/estimate')
  async estimate(@Req() req: any, @Param('id') id: string) {
    return this.campaignService.estimate(req.user.businessId, id);
  }

  @Post(':id/confirm')
  async confirm(@Req() req: any, @Param('id') id: string) {
    return this.campaignService.confirm(req.user.businessId, id);
  }

  @Delete(':id')
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.campaignService.cancel(req.user.businessId, id);
  }
}
