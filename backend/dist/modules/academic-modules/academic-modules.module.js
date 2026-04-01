"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicModulesModule = void 0;
const common_1 = require("@nestjs/common");
const academic_modules_controller_1 = require("./academic-modules.controller");
const academic_modules_service_1 = require("./academic-modules.service");
let AcademicModulesModule = class AcademicModulesModule {
};
exports.AcademicModulesModule = AcademicModulesModule;
exports.AcademicModulesModule = AcademicModulesModule = __decorate([
    (0, common_1.Module)({ controllers: [academic_modules_controller_1.AcademicModulesController], providers: [academic_modules_service_1.AcademicModulesService] })
], AcademicModulesModule);
//# sourceMappingURL=academic-modules.module.js.map