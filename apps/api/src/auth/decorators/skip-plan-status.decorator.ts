import { SetMetadata } from '@nestjs/common';

// Marca uma rota como acessível mesmo com o plano do negócio `expired`.
// Honrado pelo RolesGuard (ver auth/guards/roles.guard.ts). Usado nas rotas
// de escolha/pagamento de plano — a única saída do estado expirado.
export const SKIP_PLAN_STATUS_KEY = 'skipPlanStatus';

export const SkipPlanStatus = () => SetMetadata(SKIP_PLAN_STATUS_KEY, true);
