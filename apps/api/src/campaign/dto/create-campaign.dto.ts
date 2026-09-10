import { IsString, IsIn, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  // Campanhas promocionais são entregues por e-mail. WhatsApp foi descontinuado
  // (risco de bloqueio de número); notificações de engajamento migrarão para
  // push in-app. Ver docs/notificacoes.md.
  @IsIn(['email'])
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
