import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBookingPaymentDto {
  @IsIn(['pix', 'credit_card'])
  method!: 'pix' | 'credit_card';

  // Campos de cartão (checkout transparente) — o token é gerado no frontend
  // com a public key; o backend nunca vê o número do cartão.
  @IsOptional()
  @IsString()
  cardToken?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string; // ex.: 'visa', 'master'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  installments?: number;

  @IsOptional()
  @IsIn(['CPF', 'CNPJ'])
  payerDocumentType?: 'CPF' | 'CNPJ';

  @IsOptional()
  @IsString()
  payerDocumentNumber?: string;
}
