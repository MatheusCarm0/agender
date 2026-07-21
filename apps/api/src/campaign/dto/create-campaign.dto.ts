import { IsString, IsIn, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsIn(['whatsapp', 'email', 'both'])
  channel!: string;

  @IsString()
  messageText!: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
