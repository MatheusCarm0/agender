import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreatePaymentAccountDto {
  @IsIn(['CPF', 'CNPJ'])
  documentType!: 'CPF' | 'CNPJ';

  @IsString()
  @Length(11, 18)
  documentNumber!: string;

  @IsOptional()
  @IsString()
  @Length(1, 140)
  pixKey?: string;
}
