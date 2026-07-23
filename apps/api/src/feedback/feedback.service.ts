import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../queue/queue.module';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

/**
 * Canal de feedback dos beta testers (ver prioridades de lançamento): o usuário
 * logado reporta um problema/ideia e o time recebe por e-mail. O envio roda no
 * worker de notificação (side-effect nunca na request HTTP — invariante do
 * projeto); aqui só enfileiramos.
 */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {}

  async submit(
    user: { userId: string; businessId: string; role: string },
    dto: CreateFeedbackDto,
  ) {
    const [author, business] = await Promise.all([
      this.prisma.raw.user.findUnique({
        where: { id: user.userId },
        select: { name: true, email: true },
      }),
      this.prisma.raw.business.findUnique({
        where: { id: user.businessId },
        select: { name: true, slug: true },
      }),
    ]);

    await this.queue.add('feedback_report', {
      message: dto.message,
      kind: dto.kind ?? 'other',
      url: dto.url,
      businessId: user.businessId,
      businessName: business?.name,
      businessSlug: business?.slug,
      userName: author?.name,
      userEmail: author?.email,
      role: user.role,
    });

    return { received: true };
  }
}
