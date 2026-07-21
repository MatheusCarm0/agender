import { IsIn } from 'class-validator';

export class ActivatePlanDto {
  @IsIn(['basico', 'profissional', 'pro'])
  plan!: string;
}
