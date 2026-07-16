import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('revenue')
  @Roles('owner', 'admin')
  async getRevenue(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('professionalId') professionalId?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.reportService.getRevenue(from, to, professionalId, serviceId);
  }

  @Get('earnings')
  @Roles('owner', 'admin', 'professional')
  async getEarnings(
    @CurrentUser() user: RequestUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    let professionalId: string | undefined;

    if (user.role === 'professional') {
      const dbUser = await this.prisma.raw.user.findUnique({
        where: { id: user.userId },
      });
      professionalId = dbUser?.professionalId ?? undefined;
    }

    return this.reportService.getEarnings(from, to, professionalId);
  }
}
