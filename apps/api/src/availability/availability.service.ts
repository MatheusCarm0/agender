import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface Slot {
  startAt: string;
  endAt: string;
}

interface TimeRange {
  start: number;
  end: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getSlots(
    businessId: string,
    professionalId: string,
    serviceId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Slot[]> {
    const business = await this.prisma.raw.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Business not found');

    const profService = await this.prisma.raw.professionalService.findUnique({
      where: {
        professionalId_serviceId: { professionalId, serviceId },
      },
      include: { service: true },
    });
    if (!profService) throw new NotFoundException('Professional does not offer this service');

    const durationMin = profService.durationOverride ?? profService.service.durationMin;
    const bufferBefore = profService.service.bufferBefore;
    const bufferAfter = profService.service.bufferAfter;
    const totalDuration = bufferBefore + durationMin + bufferAfter;

    const allSlots: Slot[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const cacheKey = `business:${businessId}:prof:${professionalId}:service:${serviceId}:date:${dateStr}`;

      const cached = await this.redis.get(cacheKey);
      if (cached) {
        allSlots.push(...JSON.parse(cached));
        continue;
      }

      const daySlots = await this.computeDaySlots(
        businessId,
        business.timezone,
        professionalId,
        dateStr,
        durationMin,
        bufferBefore,
        bufferAfter,
        totalDuration,
      );

      await this.redis.set(cacheKey, JSON.stringify(daySlots), 'EX', 60);
      allSlots.push(...daySlots);
    }

    return allSlots;
  }

  private async computeDaySlots(
    businessId: string,
    timezone: string,
    professionalId: string,
    dateStr: string,
    durationMin: number,
    bufferBefore: number,
    bufferAfter: number,
    totalDuration: number,
  ): Promise<Slot[]> {
    const dayDate = new Date(dateStr + 'T00:00:00');
    const weekday = this.getWeekdayInTimezone(dateStr, timezone);

    const workingHours = await this.prisma.raw.workingHours.findMany({
      where: { professionalId, weekday },
    });

    if (workingHours.length === 0) return [];

    const windows: TimeRange[] = workingHours.map((wh) => {
      const start = this.localTimeToUtcMs(dateStr, wh.startTime, timezone);
      const end = this.localTimeToUtcMs(dateStr, wh.endTime, timezone);
      return { start, end };
    });

    const dayStartUtc = Math.min(...windows.map((w) => w.start));
    const dayEndUtc = Math.max(...windows.map((w) => w.end));

    const appointments = await this.prisma.raw.appointment.findMany({
      where: {
        professionalId,
        businessId,
        status: { in: ['scheduled', 'confirmed'] },
        startAt: { lt: new Date(dayEndUtc) },
        endAt: { gt: new Date(dayStartUtc) },
      },
    });

    const blocks = await this.prisma.raw.scheduleBlock.findMany({
      where: {
        businessId,
        OR: [
          { professionalId },
          { professionalId: null },
        ],
        startAt: { lt: new Date(dayEndUtc) },
        endAt: { gt: new Date(dayStartUtc) },
      },
    });

    const recurringBlocks = await this.prisma.raw.recurringBlock.findMany({
      where: {
        businessId,
        weekday,
        OR: [
          { professionalId },
          { professionalId: null },
        ],
      },
    });

    const occupied: TimeRange[] = [
      ...appointments.map((a) => ({
        start: a.startAt.getTime(),
        end: a.endAt.getTime(),
      })),
      ...blocks.map((b) => ({
        start: b.startAt.getTime(),
        end: b.endAt.getTime(),
      })),
      ...recurringBlocks.map((rb) => ({
        start: this.localTimeToUtcMs(dateStr, rb.startTime, timezone),
        end: this.localTimeToUtcMs(dateStr, rb.endTime, timezone),
      })),
    ];

    const now = Date.now();
    const stepMs = 15 * 60 * 1000;
    const durationMs = durationMin * 60 * 1000;
    const totalMs = totalDuration * 60 * 1000;
    const bufferBeforeMs = bufferBefore * 60 * 1000;

    const slots: Slot[] = [];

    for (const window of windows) {
      let cursor = window.start;
      while (cursor + totalMs <= window.end) {
        const slotStart = cursor + bufferBeforeMs;
        const slotEnd = slotStart + durationMs;
        const blockStart = cursor;
        const blockEnd = cursor + totalMs;

        if (slotStart >= now && !this.overlaps(blockStart, blockEnd, occupied)) {
          slots.push({
            startAt: new Date(slotStart).toISOString(),
            endAt: new Date(slotEnd).toISOString(),
          });
        }

        cursor += stepMs;
      }
    }

    return slots;
  }

  private overlaps(start: number, end: number, ranges: TimeRange[]): boolean {
    return ranges.some((r) => start < r.end && end > r.start);
  }

  private getWeekdayInTimezone(dateStr: string, timezone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateStr + 'T12:00:00Z');
    const name = formatter.format(d);
    return dayNames.indexOf(name);
  }

  private localTimeToUtcMs(dateStr: string, time: string, timezone: string): number {
    const localStr = `${dateStr}T${time}:00`;
    const parts = this.parseDateTimeInTimezone(localStr, timezone);
    return parts;
  }

  private parseDateTimeInTimezone(dateTimeStr: string, timezone: string): number {
    const utcMs = new Date(dateTimeStr + 'Z').getTime();
    const utcStr = new Date(utcMs).toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = new Date(utcMs).toLocaleString('en-US', { timeZone: timezone });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    const offsetMs = utcDate.getTime() - tzDate.getTime();
    return utcMs + offsetMs;
  }

  async invalidateCache(
    businessId: string,
    professionalId: string,
  ): Promise<void> {
    const pattern = `business:${businessId}:prof:${professionalId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
