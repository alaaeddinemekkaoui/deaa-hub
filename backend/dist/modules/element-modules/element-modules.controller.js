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
exports.ElementModulesController = void 0;
const common_1 = require("@nestjs/common");
const element_modules_service_1 = require("./element-modules.service");
const create_element_dto_1 = require("./dto/create-element.dto");
const update_element_dto_1 = require("./dto/update-element.dto");
const element_query_dto_1 = require("./dto/element-query.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_type_1 = require("../../common/types/role.type");
let ElementModulesController = class ElementModulesController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(query) {
        return this.service.findAll(query);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    create(dto) {
        return this.service.create(dto);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.ElementModulesController = ElementModulesController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [element_query_dto_1.ElementQueryDto]),
    __metadata("design:returntype", void 0)
], ElementModulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF, role_type_1.UserRole.VIEWER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ElementModulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_element_dto_1.CreateElementDto]),
    __metadata("design:returntype", void 0)
], ElementModulesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN, role_type_1.UserRole.STAFF),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_element_dto_1.UpdateElementDto]),
    __metadata("design:returntype", void 0)
], ElementModulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_type_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ElementModulesController.prototype, "remove", null);
exports.ElementModulesController = ElementModulesController = __decorate([
    (0, common_1.Controller)('element-modules'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [element_modules_service_1.ElementModulesService])
], ElementModulesController);
//# sourceMappingURL=element-modules.controller.js.map