"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantScopeError = exports.createTenantClient = exports.AppointmentStatus = exports.Role = exports.Prisma = exports.PrismaClient = void 0;
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return client_1.Role; } });
Object.defineProperty(exports, "AppointmentStatus", { enumerable: true, get: function () { return client_1.AppointmentStatus; } });
var tenant_extension_1 = require("./tenant-extension");
Object.defineProperty(exports, "createTenantClient", { enumerable: true, get: function () { return tenant_extension_1.createTenantClient; } });
Object.defineProperty(exports, "TenantScopeError", { enumerable: true, get: function () { return tenant_extension_1.TenantScopeError; } });
//# sourceMappingURL=index.js.map