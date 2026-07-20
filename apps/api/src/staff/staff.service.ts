import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async listStaff(businessId: string) {
    const users = await this.prisma.raw.user.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        professionalId: true,
        professional: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const pendingInvites = await this.prisma.raw.staffInvite.findMany({
      where: { businessId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        professionalId: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { users, pendingInvites };
  }

  async createInvite(businessId: string, invitedByUserId: string, dto: CreateInviteDto) {
    if (dto.role === 'professional' && !dto.professionalId) {
      throw new BadRequestException('professionalId is required for professional role');
    }

    if (dto.professionalId) {
      const prof = await this.prisma.raw.professional.findFirst({
        where: { id: dto.professionalId, businessId },
      });
      if (!prof) {
        throw new NotFoundException('Professional not found');
      }

      const existingLink = await this.prisma.raw.user.findFirst({
        where: { professionalId: dto.professionalId, active: true },
      });
      if (existingLink) {
        throw new ConflictException('Professional already linked to an active user');
      }
    }

    const existingUser = await this.prisma.raw.user.findFirst({
      where: { businessId, email: dto.email, active: true },
    });
    if (existingUser) {
      throw new ConflictException('Active user with this email already exists');
    }

    // Invalidate any existing pending invites for same email in this business
    await this.prisma.raw.staffInvite.updateMany({
      where: { businessId, email: dto.email, acceptedAt: null },
      data: { expiresAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await this.prisma.raw.staffInvite.create({
      data: {
        businessId,
        email: dto.email,
        role: dto.role,
        professionalId: dto.professionalId,
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        invitedByUserId,
      },
    });

    return { id: invite.id, token };
  }

  async listInvites(businessId: string) {
    return this.prisma.raw.staffInvite.findMany({
      where: { businessId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        professionalId: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(businessId: string, inviteId: string) {
    const invite = await this.prisma.raw.staffInvite.findFirst({
      where: { id: inviteId, businessId, acceptedAt: null },
    });
    if (!invite) {
      throw new NotFoundException('Invite not found or already accepted');
    }

    await this.prisma.raw.staffInvite.update({
      where: { id: inviteId },
      data: { expiresAt: new Date() },
    });
  }

  async acceptInvite(token: string, dto: AcceptInviteDto) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await this.prisma.raw.staffInvite.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { business: true },
    });

    if (!invite) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.raw.user.create({
      data: {
        businessId: invite.businessId,
        name: dto.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        professionalId: invite.professionalId,
      },
    });

    await this.prisma.raw.staffInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      business: { id: invite.business.id, slug: invite.business.slug, name: invite.business.name },
      ...tokens,
    };
  }

  async updateStaff(businessId: string, targetUserId: string, dto: UpdateStaffDto) {
    const target = await this.prisma.raw.user.findFirst({
      where: { id: targetUserId, businessId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot modify owner');
    }

    if (dto.professionalId) {
      const existingLink = await this.prisma.raw.user.findFirst({
        where: { professionalId: dto.professionalId, active: true, id: { not: targetUserId } },
      });
      if (existingLink) {
        throw new ConflictException('Professional already linked to another active user');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.role) data.role = dto.role;
    if (dto.professionalId !== undefined) data.professionalId = dto.professionalId;

    const updated = await this.prisma.raw.user.update({
      where: { id: targetUserId },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, professionalId: true },
    });

    return updated;
  }

  async deactivate(businessId: string, targetUserId: string) {
    const target = await this.prisma.raw.user.findFirst({
      where: { id: targetUserId, businessId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot deactivate owner');
    }

    const activeAdmins = await this.prisma.raw.user.count({
      where: { businessId, role: { in: ['owner', 'admin'] }, active: true, id: { not: targetUserId } },
    });
    if (activeAdmins === 0) {
      throw new ConflictException('Cannot deactivate the last admin/owner');
    }

    await this.prisma.raw.user.update({
      where: { id: targetUserId },
      data: { active: false, tokenVersion: { increment: 1 } },
    });
  }

  async reactivate(businessId: string, targetUserId: string) {
    const target = await this.prisma.raw.user.findFirst({
      where: { id: targetUserId, businessId, active: false },
    });
    if (!target) {
      throw new NotFoundException('Inactive user not found');
    }

    await this.prisma.raw.user.update({
      where: { id: targetUserId },
      data: { active: true },
    });
  }

  private async generateTokens(payload: {
    sub: string;
    businessId: string;
    role: string;
    tokenVersion: number;
  }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...payload }),
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d') as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
