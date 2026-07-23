import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @Length(3, 2000)
  message!: string;

  @IsOptional()
  @IsIn(['bug', 'idea', 'other'])
  kind?: 'bug' | 'idea' | 'other';

  // Página em que o usuário estava (contexto para o suporte). Opcional.
  @IsOptional()
  @IsString()
  @Length(0, 300)
  url?: string;
}
