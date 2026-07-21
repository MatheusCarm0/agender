import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { UpsertCustomizationDto } from './dto/upsert-customization.dto';

function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.substring(0, 2), 16) / 255;
  const g = parseInt(raw.substring(2, 4), 16) / 255;
  const b = parseInt(raw.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

@Injectable()
export class CustomizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async findByBusiness() {
    const businessId = this.getBusinessId();
    return this.prisma.raw.pageCustomization.findUnique({
      where: { businessId },
    });
  }

  async upsert(dto: UpsertCustomizationDto) {
    const businessId = this.getBusinessId();

    const ratio = contrastRatio(
      dto.theme.colors.text,
      dto.theme.colors.background,
    );
    if (ratio < 4.5) {
      throw new BadRequestException(
        `Contraste insuficiente entre texto e fundo (${ratio.toFixed(1)}:1). Mínimo: 4.5:1`,
      );
    }

    const data = {
      theme: dto.theme as any,
      links: (dto.links as any) ?? [],
      socials: (dto.socials as any) ?? {},
      headline: dto.headline ?? null,
      about: dto.about ?? null,
      welcomeMsg: dto.welcomeMsg ?? null,
      address: (dto.address as any) ?? null,
      gallery: (dto.gallery as any) ?? [],
      showHours: dto.showHours ?? false,
      faviconUrl: dto.faviconUrl ?? null,
    };

    const [result] = await this.prisma.raw.$transaction([
      this.prisma.raw.pageCustomization.upsert({
        where: { businessId },
        create: { businessId, ...data },
        update: data,
      }),
      this.prisma.raw.business.update({
        where: { id: businessId },
        data: { coverUrl: dto.theme.coverUrl ?? null },
      }),
    ]);
    return result;
  }
}
