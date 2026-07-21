import { SetMetadata } from '@nestjs/common';
import { SKIP_PLAN_STATUS_KEY } from '../guards/plan-status.guard';

export const SkipPlanStatus = () => SetMetadata(SKIP_PLAN_STATUS_KEY, true);
