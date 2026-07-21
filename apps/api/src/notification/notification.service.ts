import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../queue/queue.module';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueueBookingConfirmation(appointmentId: string, businessId: string) {
    await this.queue.add(
      'booking_confirmation',
      { appointmentId, businessId },
      { jobId: `confirm-${appointmentId}` },
    );
  }

  async enqueueBookingCancellation(appointmentId: string, businessId: string) {
    await this.queue.add(
      'booking_cancelled',
      { appointmentId, businessId },
      { jobId: `cancel-${appointmentId}` },
    );
  }

  async enqueueBookingReminder(appointmentId: string, businessId: string, delayMs: number) {
    await this.queue.add(
      'booking_reminder',
      { appointmentId, businessId },
      { jobId: `reminder-${appointmentId}`, delay: delayMs },
    );
  }

  async enqueueMembershipExpiring(membershipId: string, businessId: string) {
    await this.queue.add(
      'membership_expiring',
      { membershipId, businessId },
      { jobId: `membership-exp-${membershipId}` },
    );
  }

  async enqueueTrialWarning(businessId: string, daysLeft: number) {
    await this.queue.add(
      'trial_warning',
      { businessId, daysLeft },
      { jobId: `trial-warn-${businessId}-d${daysLeft}` },
    );
  }

  async findLogs(businessId: string) {
    return this.prisma.raw.notificationLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
