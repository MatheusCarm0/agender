import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

/**
 * Login com e-mail que existe em mais de um negócio (F-07): o e-mail é único
 * POR negócio, então a autenticação precisa varrer os candidatos e entrar no
 * negócio cuja SENHA confere — não no primeiro que o banco devolver.
 */
describe('AuthService.login — e-mail multi-negócio (F-07)', () => {
  let hashRight: string;
  let hashOther: string;

  beforeAll(async () => {
    hashRight = await argon2.hash('rightpass');
    hashOther = await argon2.hash('otherpass');
  });

  function make(users: any[]) {
    const prisma = {
      unsafe: { user: { findMany: jest.fn().mockResolvedValue(users) } },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('tok') };
    const config = { get: jest.fn().mockReturnValue('x') };
    const notifications = {};
    const service = new AuthService(
      prisma as any,
      jwt as any,
      config as any,
      notifications as any,
    );
    return { service, prisma };
  }

  const userIn = (id: string, bizId: string, passwordHash: string) => ({
    id,
    name: 'Ana',
    email: 'ana@example.com',
    role: 'owner',
    active: true,
    businessId: bizId,
    tokenVersion: 0,
    passwordHash,
    business: { id: bizId, slug: bizId, name: bizId, plan: 'basico', planStatus: 'trialing', trialEndsAt: null, onboardingStep: 1, onboardingCompletedAt: null },
  });

  it('entra no negócio cuja senha confere, não no primeiro da lista', async () => {
    const { service } = make([
      userIn('uA', 'bizA', hashOther),
      userIn('uB', 'bizB', hashRight),
    ]);
    const res = await service.login({ email: 'ana@example.com', password: 'rightpass' } as any);
    expect(res.business.id).toBe('bizB');
    expect(res.user.id).toBe('uB');
  });

  it('rejeita quando nenhuma senha confere', async () => {
    const { service } = make([userIn('uA', 'bizA', hashOther)]);
    await expect(
      service.login({ email: 'ana@example.com', password: 'rightpass' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita e-mail inexistente (sem vazar por timing)', async () => {
    const { service, prisma } = make([]);
    await expect(
      service.login({ email: 'ninguem@example.com', password: 'x' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.unsafe.user.findMany).toHaveBeenCalled();
  });
});
