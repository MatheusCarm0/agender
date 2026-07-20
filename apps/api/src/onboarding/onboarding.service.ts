import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STEP_NAMES: Record<number, string> = {
  2: 'logo',
  3: 'service',
  4: 'working_hours',
  5: 'team',
};

const VALID_STEPS = [2, 3, 4, 5, 6, 7];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(businessId: string) {
    const business = await this.prisma.raw.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        onboardingStep: true,
        onboardingCompletedAt: true,
        onboardingSkipped: true,
      },
    });

    const skipped = business.onboardingSkipped as string[];
    const pendingItems = skipped.filter((item) => item !== null);

    return {
      onboardingStep: business.onboardingStep,
      onboardingCompletedAt: business.onboardingCompletedAt,
      pendingItems,
      completed: business.onboardingCompletedAt !== null,
    };
  }

  async advanceStep(
    businessId: string,
    step: number,
    action: 'complete' | 'skip',
  ) {
    if (!VALID_STEPS.includes(step)) {
      throw new BadRequestException('Invalid step');
    }

    const business = await this.prisma.raw.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { onboardingStep: true, onboardingSkipped: true },
    });

    const skipped = business.onboardingSkipped as string[];
    const newSkipped = [...skipped];

    if (action === 'skip' && STEP_NAMES[step]) {
      if (!newSkipped.includes(STEP_NAMES[step])) {
        newSkipped.push(STEP_NAMES[step]);
      }
    }

    const nextStep = step + 1;
    const isComplete = nextStep > 7;

    await this.prisma.raw.business.update({
      where: { id: businessId },
      data: {
        onboardingStep: Math.min(nextStep, 7),
        onboardingSkipped: newSkipped,
        ...(isComplete ? { onboardingCompletedAt: new Date() } : {}),
      },
    });

    return this.getStatus(businessId);
  }

  async dismissItem(businessId: string, item: string) {
    const validItems = Object.values(STEP_NAMES);
    if (!validItems.includes(item)) {
      throw new BadRequestException('Invalid checklist item');
    }

    const business = await this.prisma.raw.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { onboardingSkipped: true },
    });

    const skipped = business.onboardingSkipped as string[];
    const newSkipped = skipped.filter((s) => s !== item);

    const allDismissed = newSkipped.length === 0;

    await this.prisma.raw.business.update({
      where: { id: businessId },
      data: {
        onboardingSkipped: newSkipped,
        ...(allDismissed ? { onboardingCompletedAt: new Date() } : {}),
      },
    });

    return this.getStatus(businessId);
  }
}
