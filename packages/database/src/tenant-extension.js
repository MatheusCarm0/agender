"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantScopeError = void 0;
exports.createTenantClient = createTenantClient;
const TENANT_MODELS = new Set([
    'User',
    'Professional',
    'Service',
    'ProfessionalService',
    'WorkingHours',
    'ScheduleBlock',
    'Client',
    'Appointment',
]);
const GUARDED_SET_OPS = [
    'findMany',
    'count',
    'aggregate',
    'groupBy',
    'updateMany',
    'deleteMany',
    'createMany',
];
class TenantScopeError extends Error {
    constructor(model, operation) {
        super(`Tenant isolation: ${model}.${operation}() sem filtro de businessId. ` +
            'Adicione `where: { businessId }` (ou use o client `unsafe` se a query for ' +
            'intencionalmente global — auth pré-contexto, cron cross-tenant).');
        this.name = 'TenantScopeError';
    }
}
exports.TenantScopeError = TenantScopeError;
function hasBusinessId(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 8)
        return false;
    if (Array.isArray(node)) {
        return node.some((n) => hasBusinessId(n, depth + 1));
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === 'businessId' && value !== undefined && value !== null)
            return true;
        if (value && typeof value === 'object' && hasBusinessId(value, depth + 1)) {
            return true;
        }
    }
    return false;
}
function assertScoped(model, operation, args) {
    if (operation === 'createMany') {
        const rows = Array.isArray(args?.data) ? args.data : args?.data ? [args.data] : [];
        const ok = rows.length > 0 && rows.every((r) => hasBusinessId(r));
        if (!ok)
            throw new TenantScopeError(model, operation);
        return;
    }
    if (!hasBusinessId(args?.where)) {
        throw new TenantScopeError(model, operation);
    }
}
function createTenantClient(baseClient) {
    const guarded = {};
    for (const op of GUARDED_SET_OPS) {
        guarded[op] = async ({ model, operation, args, query }) => {
            if (TENANT_MODELS.has(model)) {
                assertScoped(model, operation, args);
            }
            return query(args);
        };
    }
    return baseClient.$extends({
        query: { $allModels: guarded },
    });
}
//# sourceMappingURL=tenant-extension.js.map