import { PaymentAccountService } from './payment-account.service';
import { encryptSecret } from '../common/token-crypto';

// Modelo marketplace (OAuth): o dinheiro do agendamento cai na conta MP do
// lojista; o saldo é o saldo REAL do MP; conectar = OAuth. Estes testes cobrem
// a costura do split (credenciais do lojista) e o estado não-conectado.
describe('PaymentAccountService', () => {
  const BIZ = 'biz1';
  const prevKey = process.env.TOKEN_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex
  });
  afterAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = prevKey;
  });

  function make(account: any, payments: any[] = []) {
    const prisma = {
      raw: {
        paymentAccount: {
          findUnique: jest.fn().mockResolvedValue(account),
          upsert: jest.fn().mockResolvedValue(account),
        },
        bookingPayment: {
          // computeReceived + recentPayments consultam confirmados.
          findMany: jest.fn().mockResolvedValue(payments),
        },
      },
    };
    const config = { get: jest.fn((k: string, d?: any) => d) };
    const provider = {
      name: 'mercadopago',
      getSellerBalance: jest.fn(),
      refreshOAuthToken: jest.fn(),
    };
    const service = new PaymentAccountService(
      prisma as any,
      config as any,
      provider as any,
    );
    return { service, provider };
  }

  it('conta não conectada: get() reporta connected=false, sem link de saque', async () => {
    const { service, provider } = make({
      businessId: BIZ,
      status: 'pending_verification',
      oauthAccessToken: null,
    });
    const res = await service.get(BIZ);
    expect(res.connected).toBe(false);
    expect(res.withdrawUrl).toBeNull();
    expect(provider.getSellerBalance).not.toHaveBeenCalled();
  });

  it('extrato próprio: soma os pagamentos confirmados (bruto/taxa/líquido)', async () => {
    const account = {
      businessId: BIZ,
      status: 'active',
      provider: 'mercadopago',
      externalAccountId: 'seller-123',
      connectedAt: new Date(),
      pixUnavailable: false,
      oauthAccessToken: encryptSecret('SELLER-TOKEN'),
      oauthRefreshToken: encryptSecret('SELLER-REFRESH'),
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    };
    const { service } = make(account, [
      { amount: 100, method: 'pix' },
      { amount: 50, method: 'credit_card' },
    ]);
    const res = await service.get(BIZ);
    expect(res.received.count).toBe(2);
    expect(res.received.gross).toBe(150);
    // líquido = bruto − taxa estimada; menor que o bruto e coerente
    expect(res.received.net).toBeLessThan(res.received.gross);
    expect(res.received.net).toBeCloseTo(150 - res.received.estimatedFees, 2);
  });

  it('sem conta conectada, getSellerCredentials devolve null (bloqueia cobrança)', async () => {
    const { service } = make(null);
    await expect(service.getSellerCredentials(BIZ)).resolves.toBeNull();
  });

  it('conta conectada: link para o MP, sem puxar saldo por API, e token só interno', async () => {
    const account = {
      businessId: BIZ,
      status: 'active',
      provider: 'mercadopago',
      externalAccountId: 'seller-123',
      connectedAt: new Date(),
      oauthAccessToken: encryptSecret('SELLER-TOKEN'),
      oauthRefreshToken: encryptSecret('SELLER-REFRESH'),
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    };
    const { service, provider } = make({ ...account, pixUnavailable: false });

    const res = await service.get(BIZ);
    expect(res.connected).toBe(true);
    // saldo global é bloqueado pelo MP no marketplace: não chamamos a API
    expect(res.withdrawUrl).toBeTruthy();
    expect(provider.getSellerBalance).not.toHaveBeenCalled();
    // a view pública nunca inclui o token
    expect(JSON.stringify(res)).not.toContain('SELLER-TOKEN');

    const creds = await service.getSellerCredentials(BIZ);
    expect(creds).toEqual({ accessToken: 'SELLER-TOKEN', userId: 'seller-123' });
  });
});
