import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentAccountService } from './payment-account.service';

describe('PaymentAccountService', () => {
  const BIZ = 'biz1';

  function make(tx: { payments?: any[]; withdrawals?: any[] } = {}) {
    const txClient = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      bookingPayment: {
        findMany: jest.fn().mockResolvedValue(tx.payments ?? []),
      },
      withdrawal: {
        findMany: jest.fn().mockResolvedValue(tx.withdrawals ?? []),
        create: jest.fn().mockResolvedValue({ id: 'w1' }),
      },
    };
    const prisma = {
      raw: {
        paymentAccount: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'acc1', status: 'active', pixKey: 'k' }),
        },
        $transaction: jest.fn((cb: any) => cb(txClient)),
      },
    };
    const provider = { createWithdrawal: jest.fn() };
    const service = new PaymentAccountService(prisma as any, provider as any);
    return { service, provider };
  }

  it('recusa saque acima do saldo disponível (transação atômica)', async () => {
    const { service, provider } = make({
      payments: [{ amount: 100, method: 'pix' }],
      withdrawals: [],
    });
    // disponível ~= 100 − taxa; pedir 100000 estoura com folga
    await expect(service.withdraw(BIZ, 100000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // não chega a chamar o gateway
    expect(provider.createWithdrawal).not.toHaveBeenCalled();
  });

  it('bloqueia a verificação manual de KYC em produção (F-08)', async () => {
    const { service } = make();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(service.markVerified(BIZ)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
