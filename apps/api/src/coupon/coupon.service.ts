import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().trim();

    const existing = await this.prisma.raw.coupon.findUnique({
      where: { businessId_code: { businessId, code } },
    });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    return this.prisma.raw.coupon.create({
      data: {
        businessId,
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        scope: dto.scope || 'all',
        serviceId: dto.serviceId,
        maxUses: dto.maxUses,
        perClientLimit: dto.perClientLimit,
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        active: dto.active ?? true,
      },
    });
  }

  async findAll(businessId: string) {
    return this.prisma.raw.coupon.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(businessId: string, id: string) {
    const coupon = await this.prisma.raw.coupon.findFirst({
      where: { id, businessId },
      include: { redemptions: { take: 50, orderBy: { createdAt: 'desc' } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(businessId: string, id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.raw.coupon.findFirst({
      where: { id, businessId },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.raw.coupon.update({
      where: { id },
      data: {
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.perClientLimit !== undefined ? { perClientLimit: dto.perClientLimit } : {}),
        ...(dto.validUntil ? { validUntil: new Date(dto.validUntil) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async delete(businessId: string, id: string) {
    const coupon = await this.prisma.raw.coupon.findFirst({
      where: { id, businessId },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    await this.prisma.raw.coupon.delete({ where: { id } });
    return { deleted: true };
  }

  async validateAndApply(
    tx: Prisma.TransactionClient,
    businessId: string,
    couponCode: string,
    serviceId: string,
    clientId: string,
    price: Prisma.Decimal,
  ): Promise<{ couponId: string; discountAmount: Prisma.Decimal }> {
    const coupon = await tx.coupon.findUnique({
      where: { businessId_code: { businessId, code: couponCode.toUpperCase().trim() } },
    });

    if (!coupon || !coupon.active) {
      throw new BadRequestException('Invalid or inactive coupon');
    }

    if (new Date() < coupon.validFrom) {
      throw new BadRequestException('Coupon not yet valid');
    }
    if (coupon.validUntil && new Date() > coupon.validUntil) {
      throw new BadRequestException('Coupon expired');
    }

    if (coupon.scope === 'service' && coupon.serviceId !== serviceId) {
      throw new BadRequestException('Coupon does not apply to this service');
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (coupon.perClientLimit !== null) {
      const clientRedemptions = await tx.couponRedemption.count({
        where: { couponId: coupon.id, clientId },
      });
      if (clientRedemptions >= coupon.perClientLimit) {
        throw new BadRequestException('You have already used this coupon the maximum number of times');
      }
    }

    let discountAmount: Prisma.Decimal;
    if (coupon.discountType === 'percent') {
      discountAmount = price.mul(coupon.discountValue).div(100);
    } else {
      discountAmount = Prisma.Decimal.min(coupon.discountValue, price);
    }

    await tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return { couponId: coupon.id, discountAmount };
  }
}
