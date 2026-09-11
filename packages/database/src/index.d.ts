export { PrismaClient, Prisma, Role, AppointmentStatus, } from '@prisma/client';
export type { Business, User, Professional, Service, ProfessionalService, WorkingHours, ScheduleBlock, Client, Appointment, } from '@prisma/client';
export { createTenantClient, TenantScopeError } from './tenant-extension';
