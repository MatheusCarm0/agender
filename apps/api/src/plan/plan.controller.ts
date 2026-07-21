import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipPlanStatus } from '../auth/decorators/skip-plan-status.decorator';
import { PlanService } from './plan.service';
import { ActivatePlanDto } from './dto/activate-plan.dto';

@Controller('plan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @Roles('owner', 'admin')
  @SkipPlanStatus()
  async getPlan(@Req() req: any) {
    return this.planService.getBusinessPlan(req.user.businessId);
  }

  @Post('activate')
  @Roles('owner')
  @SkipPlanStatus()
  async activatePlan(@Req() req: any, @Body() dto: ActivatePlanDto) {
    return this.planService.activatePlan(req.user.businessId, dto.plan);
  }

  @Get('usage')
  @Roles('owner', 'admin')
  @SkipPlanStatus()
  async getUsage(@Req() req: any) {
    return this.planService.getUsage(req.user.businessId);
  }
}
