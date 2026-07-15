import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const business = await this.prisma.raw.business.findUnique({
      where: { id },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.raw.business.findUnique({
      where: { id },
    });
    if (!business) throw new NotFoundException('Business not found');

    return this.prisma.raw.business.update({
      where: { id },
      data: dto,
    });
  }
}
