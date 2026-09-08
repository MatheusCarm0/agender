import { PrismaClient } from '@prisma/client';
export declare class TenantScopeError extends Error {
    constructor(model: string, operation: string);
}
export declare function createTenantClient(baseClient: PrismaClient): import("node_modules/@prisma/client/runtime/library").DynamicClientExtensionThis<import("node_modules/@prisma/client/default").Prisma.TypeMap<import("node_modules/@prisma/client/runtime/library").InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {};
}, {}>, import("node_modules/@prisma/client/default").Prisma.TypeMapCb<import("node_modules/@prisma/client/default").Prisma.PrismaClientOptions>, {
    result: {};
    model: {};
    query: {};
    client: {};
}>;
