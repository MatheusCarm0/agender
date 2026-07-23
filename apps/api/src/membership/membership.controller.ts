import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresPlan } from '../auth/decorators/requires-plan.decorator';
import { PLANS_WITH } from '../plan/plan-limits';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MembershipService } from './membership.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateMembershipDto, UpdateMembershipDto } from './dto/create-membership.dto';

// Fidelidade é exclusiva do Pro (matriz em plan/plan-limits.ts). Gate só nas
// MUTAÇÕES — leitura livre para dados históricos após downgrade.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('owner', 'admin')
export class MembershipController {
  constructor(private readonly service: MembershipService) {}

  // --- Plans ---

  @Post('membership-plans')
  @RequiresPlan(...PLANS_WITH.memberships)
  createPlan(
    @CurrentUser() user: { businessId: string },
    @Body() dto: CreatePlanDto,
  ) {
    return this.service.createPlan(user.businessId, dto);
  }

  @Get('membership-plans')
  findAllPlans(@CurrentUser() user: { businessId: string }) {
    return this.service.findAllPlans(user.businessId);
  }

  @Patch('membership-plans/:id')
  @RequiresPlan(...PLANS_WITH.memberships)
  updatePlan(
    @CurrentUser() user: { businessId: string },
    @Param('id') id: string,
    @Body() dto: Partial<CreatePlanDto>,
  ) {
    return this.service.updatePlan(user.businessId, id, dto);
  }

  // --- Memberships ---

  @Post('client-memberships')
  @RequiresPlan(...PLANS_WITH.memberships)
  createMembership(
    @CurrentUser() user: { businessId: string },
    @Body() dto: CreateMembershipDto,
  ) {
    return this.service.createMembership(user.businessId, dto);
  }

  @Get('client-memberships')
  findAllMemberships(@CurrentUser() user: { businessId: string }) {
    return this.service.findAllMemberships(user.businessId);
  }

  @Patch('client-memberships/:id')
  @RequiresPlan(...PLANS_WITH.memberships)
  updateMembership(
    @CurrentUser() user: { businessId: string },
    @Param('id') id: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.service.updateMembership(user.businessId, id, dto);
  }
}
