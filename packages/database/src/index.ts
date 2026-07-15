export { PrismaClient, Prisma, Role } from '@prisma/client';
export type { Business, User, Professional } from '@prisma/client';
export { createTenantClient, setTenantContextProvider } from './tenant-extension';
