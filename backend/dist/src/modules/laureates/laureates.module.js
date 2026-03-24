"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaureatesModule = void 0;
const common_1 = require("@nestjs/common");
const laureates_controller_1 = require("./laureates.controller");
const laureates_service_1 = require("./laureates.service");
let LaureatesModule = class LaureatesModule {
};
exports.LaureatesModule = LaureatesModule;
exports.LaureatesModule = LaureatesModule = __decorate([
    (0, common_1.Module)({
        controllers: [laureates_controller_1.LaureatesController],
        providers: [laureates_service_1.LaureatesService],
        exports: [laureates_service_1.LaureatesService],
    })
], LaureatesModule);
//# sourceMappingURL=laureates.module.js.map