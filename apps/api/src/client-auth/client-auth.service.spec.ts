import { HttpException, HttpStatus } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';

describe('ClientAuthService', () => {
  const BIZ = 'biz1';

  function make(overrides: {
    client?: any;
    otp?: any;
  } = {}) {
    const prisma = {
      raw: {
        client: {
          findUnique: jest.fn().mockResolvedValue(overrides.client ?? null),
          update: jest.fn(),
        },
        clientOtp: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(overrides.otp ?? null),
          update: jest.fn(),
        },
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('tok') };
    const config = { get: jest.fn().mockReturnValue('test') };
    const notifications = { enqueueClientOtp: jest.fn() };
    const redis = { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() };
    const service = new ClientAuthService(
      prisma as any,
      jwt as any,
      config as any,
      notifications as any,
      redis as any,
    );
    return { service, prisma, notifications };
  }

  it('startOtp não revela se o telefone tem conta (F-12)', async () => {
    const { service, notifications } = make({ client: null });
    const res = await service.startOtp(BIZ, '11999990000');
    expect(res.channel).toBe('unknown');
    expect(res.message).toMatch(/Se houver/i);
    // não dispara envio para telefone sem conta
    expect(notifications.enqueueClientOtp).not.toHaveBeenCalled();
  });

  it('verifyOtp bloqueia após o teto de tentativas', async () => {
    const { service } = make({
      client: { id: 'c1' },
      otp: { id: 'o1', code: 'hash', attempts: 5 },
    });
    await expect(service.verifyOtp(BIZ, '11999990000', '123456')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('verifyOtp exige um código válido existente', async () => {
    const { service } = make({ client: { id: 'c1' }, otp: null });
    await expect(service.verifyOtp(BIZ, '11999990000', '123456')).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
