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
exports.CoursController = void 0;
const common_1 = require("@nestjs/common");
const cours_service_1 = require("./cours.service");
const create_cours_dto_1 = require("./dto/create-cours.dto");
const update_cours_dto_1 = require("./dto/update-cours.dto");
const cours_query_dto_1 = require("./dto/cours-query.dto");
const assign_cours_class_dto_1 = require("./dto/assign-cours-class.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_type_1 = require("../../common/types/role.type");
let CoursController = class CoursController {
    coursService;
    constructor(coursService) {
        this.coursService = coursService;
    }
    findAll(query) {
        return this.coursService.findAll(query);
    }
    findOne(id) {
        return this.coursService.findOne(id);
    }
    create(dto) {
        return this.coursService.create(dto);
    }
    update(id, dto) {
        return this.coursService.update(id, dto);
    }
    remove(id) {
        return this.coursService.remove(id);
    }
    assignToClass(id, dto) {
        return this.coursService.assignToClass(id, dto);
    }
    removeFromClass(id, classId) {
        return this.coursService.removeFromClass(id, classId);
    }
    importFromClass(classId) {
        return this.coursService.importFromClass(classId);
    }
};
exports.CoursController = CoursController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cours_query_dto_1.CoursQueryDto]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cours_dto_1.CreateCoursDto]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_cours_dto_1.UpdateCoursDto]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/classes'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, assign_cours_class_dto_1.AssignCoursClassDto]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "assignToClass", null);
__decorate([
    (0, common_1.Delete)(':id/classes/:classId'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('classId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "removeFromClass", null);
__decorate([
    (0, common_1.Post)('import-from-class/:classId'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('classId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CoursController.prototype, "importFromClass", null);
exports.CoursController = CoursController = __decorate([
    (0, common_1.Controller)('cours'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [cours_service_1.CoursService])
], CoursController);
//# sourceMappingURL=cours.controller.js.map