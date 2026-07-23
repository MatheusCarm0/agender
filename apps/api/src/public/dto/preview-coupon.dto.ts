import { IsString } from 'class-validator';

export class PreviewCouponDto {
  @IsString()
  code!: string;

  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;
}
