import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: RequestUser) {
    return this.onboardingService.getStatus(user.businessId);
  }

  @Patch('step')
  async advanceStep(
    @CurrentUser() user: RequestUser,
    @Body() body: { step: number; action: 'complete' | 'skip' },
  ) {
    return this.onboardingService.advanceStep(
      user.businessId,
      body.step,
      body.action,
    );
  }

  @Patch('dismiss')
  async dismissItem(
    @CurrentUser() user: RequestUser,
    @Body() body: { item: string },
  ) {
    return this.onboardingService.dismissItem(user.businessId, body.item);
  }
}
