import { SetMetadata } from '@nestjs/common';

export const PLAN_KEY = 'requiredPlans';
export const RequiresPlan = (...plans: string[]) =>
  SetMetadata(PLAN_KEY, plans);
