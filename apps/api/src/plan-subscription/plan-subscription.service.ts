import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
  SubscriptionStatus,
} from '../payment/payment-provider.interface';
import { PLAN_PRICING, getPlanPrice } from '../payment/plan-pricing';

@Injectable()
export class PlanSubscriptionService {
  private readonly logger = new Logger(PlanSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Assinatura atual + catálogo de planos com preço (para a UI). */
  async getForBusiness(businessId: string) {
    const [business, subscription] = await Promise.all([
      this.prisma.raw.business.findUnique({
        where: { id: businessId },
        select: { plan: true, planStatus: true, planUpdatedAt: true },
      }),
      this.prisma.raw.planSubscription.findUnique({ where: { businessId } }),
    ]);

    return {
      plan: business?.plan,
      planStatus: business?.planStatus,
      planUpdatedAt: business?.planUpdatedAt,
      subscription: subscription
        ? {
            id: subscription.id,
            planTier: subscription.planTier,
            status: subscription.status,
            amount: Number(subscription.amount),
            checkoutUrl: subscription.checkoutUrl,
            nextDueDate: subscription.nextDueDate,
          }
        : null,
      catalog: Object.values(PLAN_PRICING),
    };
  }

  /**
   * Inicia (ou troca) a assinatura de plano. Cria o preapproval no gateway e
   * devolve o checkoutUrl para o dono concluir o pagamento. O plano só vira
   * `active` quando o webhook (ou o sync) confirmar — nunca liberamos acesso
   * antes da confirmação do gateway.
   */
  async subscribe(businessId: string, planTier: PlanTier) {
    const owner = await this.prisma.raw.user.findFirst({
      where: { businessId, role: 'owner', active: true },
      select: { email: true },
    });
    if (!owner?.email) {
      throw new NotFoundException('Dono do negócio não encontrado.');
    }

    // Se já existe uma assinatura viva no gateway (active/pending), cancela ANTES
    // de criar a nova — senão o dono seria cobrado por dois preapprovals. Cancela
    // em best-effort: falha no cancelamento não impede a nova assinatura, mas é logada.
    const existing = await this.prisma.raw.planSubscription.findUnique({
      where: { businessId },
    });
    if (existing && ['active', 'pending'].includes(existing.status)) {
      try {
        await this.provider.cancelSubscription(existing.gatewaySubscriptionId);
      } catch (e: any) {
        this.logger.warn(
          `Não foi possível cancelar a assinatura anterior ${existing.gatewaySubscriptionId}: ${e.message}`,
        );
      }
    }

    const amount = getPlanPrice(planTier);
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    const apiUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');

    const result = await this.provider.createSubscription({
      amount,
      reason: `Assinatura Agender — plano ${PLAN_PRICING[planTier].label}`,
      payer: { email: owner.email },
      externalReference: businessId,
      backUrl: `${webUrl}/admin/plano?subscription=return`,
      notificationUrl: `${apiUrl}/webhooks/mercadopago`,
    });

    const subscription = await this.prisma.raw.planSubscription.upsert({
      where: { businessId },
      create: {
        businessId,
        provider: this.provider.name,
        gatewaySubscriptionId: result.subscriptionId,
        planTier,
        status: result.status,
        amount,
        checkoutUrl: result.checkoutUrl,
        nextDueDate: result.nextDueDate,
      },
      update: {
        provider: this.provider.name,
        gatewaySubscriptionId: result.subscriptionId,
        planTier,
        status: result.status,
        amount,
        checkoutUrl: result.checkoutUrl,
        nextDueDate: result.nextDueDate,
      },
    });

    // Se o gateway já confirmou na criação (raro), aplica imediatamente.
    if (result.status === 'active') {
      await this.applyStatusToBusiness(businessId, planTier, 'active');
    }

    return {
      checkoutUrl: subscription.checkoutUrl,
      status: subscription.status,
      planTier: subscription.planTier,
      amount: Number(subscription.amount),
    };
  }

  /**
   * Consulta o gateway e reconcilia o status local. Usado como fallback em
   * dev (webhook não alcança localhost) e pelo retorno do checkout.
   */
  async sync(businessId: string) {
    const subscription = await this.prisma.raw.planSubscription.findUnique({
      where: { businessId },
    });
    if (!subscription) {
      throw new NotFoundException('Nenhuma assinatura para sincronizar.');
    }

    const remote = await this.provider.getSubscription(
      subscription.gatewaySubscriptionId,
    );

    await this.applyRemoteStatus(
      businessId,
      subscription.planTier,
      remote.status,
      remote.nextDueDate,
    );

    return this.getForBusiness(businessId);
  }

  async cancel(businessId: string) {
    const subscription = await this.prisma.raw.planSubscription.findUnique({
      where: { businessId },
    });
    if (!subscription) {
      throw new NotFoundException('Nenhuma assinatura para cancelar.');
    }

    await this.provider.cancelSubscription(subscription.gatewaySubscriptionId);
    await this.prisma.raw.planSubscription.update({
      where: { businessId },
      data: { status: 'cancelled' },
    });

    // Não expira o acesso na hora: o dono mantém o plano até o fim do ciclo.
    // A expiração real é conduzida pelo cron/estado 'pastDue' já existente.
    return { status: 'cancelled' };
  }

  /**
   * Aplica uma mudança de status vinda do webhook (por id de assinatura do
   * gateway). Idempotência do evento é garantida na camada de webhook.
   */
  async handleWebhookStatus(gatewaySubscriptionId: string) {
    const subscription = await this.prisma.raw.planSubscription.findFirst({
      where: { gatewaySubscriptionId },
    });
    if (!subscription) {
      this.logger.warn(
        `Webhook de assinatura ${gatewaySubscriptionId} sem registro local.`,
      );
      return;
    }

    const remote = await this.provider.getSubscription(gatewaySubscriptionId);
    await this.applyRemoteStatus(
      subscription.businessId,
      subscription.planTier,
      remote.status,
      remote.nextDueDate,
    );
  }

  private async applyRemoteStatus(
    businessId: string,
    planTier: PlanTier,
    status: SubscriptionStatus,
    nextDueDate?: Date,
  ) {
    await this.prisma.raw.planSubscription.update({
      where: { businessId },
      data: { status, nextDueDate },
    });

    if (status === 'active') {
      await this.applyStatusToBusiness(businessId, planTier, 'active');
    } else if (status === 'overdue') {
      await this.applyStatusToBusiness(businessId, planTier, 'pastDue');
    }
    // 'pending'/'cancelled' não alteram o acesso já concedido aqui.
  }

  private async applyStatusToBusiness(
    businessId: string,
    planTier: PlanTier,
    planStatus: 'active' | 'pastDue',
  ) {
    await this.prisma.raw.business.update({
      where: { id: businessId },
      data:
        planStatus === 'active'
          ? { plan: planTier, planStatus: 'active', planUpdatedAt: new Date() }
          : { planStatus: 'pastDue' },
    });
    this.logger.log(
      `Business ${businessId}: plano=${planTier} status=${planStatus} (via gateway).`,
    );
  }
}
