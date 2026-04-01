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
exports.AccreditationsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_type_1 = require("../../common/types/role.type");
const accreditations_service_1 = require("./accreditations.service");
const accreditation_plan_query_dto_1 = require("./dto/accreditation-plan-query.dto");
const create_accreditation_plan_dto_1 = require("./dto/create-accreditation-plan.dto");
const update_accreditation_plan_dto_1 = require("./dto/update-accreditation-plan.dto");
const create_accreditation_line_dto_1 = require("./dto/create-accreditation-line.dto");
const assign_class_accreditation_dto_1 = require("./dto/assign-class-accreditation.dto");
let AccreditationsController = class AccreditationsController {
    service;
    constructor(service) {
        this.service = service;
    }
    findPlans(query) {
        return this.service.findPlans(query);
    }
    findPlan(id) {
        return this.service.findPlan(id);
    }
    createPlan(dto) {
        return this.service.createPlan(dto);
    }
    updatePlan(id, dto) {
        return this.service.updatePlan(id, dto);
    }
    createLine(planId, dto) {
        return this.service.createLine(planId, dto);
    }
    removeLine(id) {
        return this.service.removeLine(id);
    }
    diffWithSource(id) {
        return this.service.diffWithSource(id);
    }
    assignPlanToClassYear(planId, dto) {
        return this.service.assignPlanToClassYear(planId, dto);
    }
    findClassAssignments(classId) {
        return this.service.findClassAssignments(classId);
    }
};
exports.AccreditationsController = AccreditationsController;
__decorate([
    (0, common_1.Get)('plans'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accreditation_plan_query_dto_1.AccreditationPlanQueryDto]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "findPlans", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "findPlan", null);
__decorate([
    (0, common_1.Post)('plans'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_accreditation_plan_dto_1.CreateAccreditationPlanDto]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Patch)('plans/:id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_accreditation_plan_dto_1.UpdateAccreditationPlanDto]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Post)('plans/:id/lines'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_accreditation_line_dto_1.CreateAccreditationLineDto]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "createLine", null);
__decorate([
    (0, common_1.Delete)('lines/:id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "removeLine", null);
__decorate([
    (0, common_1.Get)('plans/:id/diff'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "diffWithSource", null);
__decorate([
    (0, common_1.Post)('plans/:id/assignments'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, assign_class_accreditation_dto_1.AssignClassAccreditationDto]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "assignPlanToClassYear", null);
__decorate([
    (0, common_1.Get)('classes/:classId/assignments'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Param)('classId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AccreditationsController.prototype, "findClassAssignments", null);
exports.AccreditationsController = AccreditationsController = __decorate([
    (0, common_1.Controller)('accreditations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [accreditations_service_1.AccreditationsService])
], AccreditationsController);
//# sourceMappingURL=accreditations.controller.js.map