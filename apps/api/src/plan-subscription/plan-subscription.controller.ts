import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipPlanStatus } from '../auth/decorators/skip-plan-status.decorator';
import { PlanSubscriptionService } from './plan-subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

// Assinatura de plano é a única via de saída do estado `expired` — por isso
// todas as rotas usam @SkipPlanStatus (o dono precisa conseguir assinar mesmo
// com o teste vencido). Mesmo padrão do PlanController.
@Controller('plan-subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanSubscriptionController {
  constructor(private readonly service: PlanSubscriptionService) {}

  @Get()
  @Roles('owner', 'admin')
  @SkipPlanStatus()
  async get(@Req() req: any) {
    return this.service.getForBusiness(req.user.businessId);
  }

  @Post()
  @Roles('owner')
  @SkipPlanStatus()
  async subscribe(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.service.subscribe(req.user.businessId, dto.plan);
  }

  @Post('sync')
  @Roles('owner', 'admin')
  @SkipPlanStatus()
  async sync(@Req() req: any) {
    return this.service.sync(req.user.businessId);
  }

  @Post('cancel')
  @Roles('owner')
  @SkipPlanStatus()
  async cancel(@Req() req: any) {
    return this.service.cancel(req.user.businessId);
  }
}
