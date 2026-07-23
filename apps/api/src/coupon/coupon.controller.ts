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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresPlan } from '../auth/decorators/requires-plan.decorator';
import { PLANS_WITH } from '../plan/plan-limits';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

// Cupons: Profissional/Pro (matriz em plan/plan-limits.ts). Gate só nas
// MUTAÇÕES — leitura continua livre para o dono ver dados históricos após
// um downgrade, sem conseguir criar/editar.
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('owner', 'admin')
export class CouponController {
  constructor(private readonly service: CouponService) {}

  @Post()
  @RequiresPlan(...PLANS_WITH.coupons)
  create(
    @CurrentUser() user: { businessId: string },
    @Body() dto: CreateCouponDto,
  ) {
    return this.service.create(user.businessId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { businessId: string }) {
    return this.service.findAll(user.businessId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { businessId: string },
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(':id')
  @RequiresPlan(...PLANS_WITH.coupons)
  update(
    @CurrentUser() user: { businessId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.service.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @RequiresPlan(...PLANS_WITH.coupons)
  delete(
    @CurrentUser() user: { businessId: string },
    @Param('id') id: string,
  ) {
    return this.service.delete(user.businessId, id);
  }
}
