import { Global, Module } from '@nestjs/common';
import { MercadoPagoProvider } from './mercadopago.provider';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

/**
 * Módulo core de pagamento. Expõe o PaymentProvider por token de injeção —
 * a troca de gateway acontece SÓ aqui (basta apontar para outra classe que
 * implemente a interface). Global para que qualquer módulo de pagamento
 * (assinatura, cobrança, saque, webhook) injete `@Inject(PAYMENT_PROVIDER)`.
 */
@Global()
@Module({
  providers: [
    MercadoPagoProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MercadoPagoProvider },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
