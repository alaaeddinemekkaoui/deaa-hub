"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclesController = void 0;
const common_1 = require("@nestjs/common");
const cycles_service_1 = require("./cycles.service");
const create_cycle_dto_1 = require("./dto/create-cycle.dto");
const update_cycle_dto_1 = require("./dto/update-cycle.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_type_1 = require("../../common/types/role.type");
let CyclesController = class CyclesController {
    cyclesService;
    constructor(cyclesService) {
        this.cyclesService = cyclesService;
    }
    findAll() { return this.cyclesService.findAll(); }
    findOne(id) { return this.cyclesService.findOne(id); }
    create(dto) { return this.cyclesService.create(dto); }
    update(id, dto) { return this.cyclesService.update(id, dto); }
    remove(id) { return this.cyclesService.remove(id); }
};
exports.CyclesController = CyclesController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CyclesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CyclesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cycle_dto_1.CreateCycleDto]),
    __metadata("design:returntype", void 0)
], CyclesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_cycle_dto_1.UpdateCycleDto]),
    __metadata("design:returntype", void 0)
], CyclesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CyclesController.prototype, "remove", null);
exports.CyclesController = CyclesController = __decorate([
    (0, common_1.Controller)('cycles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [cycles_service_1.CyclesService])
], CyclesController);
//# sourceMappingURL=cycles.controller.js.map