"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./common/prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const students_module_1 = require("./modules/students/students.module");
const teachers_module_1 = require("./modules/teachers/teachers.module");
const departments_module_1 = require("./modules/departments/departments.module");
const filieres_module_1 = require("./modules/filieres/filieres.module");
const classes_module_1 = require("./modules/classes/classes.module");
const documents_module_1 = require("./modules/documents/documents.module");
const workflows_module_1 = require("./modules/workflows/workflows.module");
const rooms_module_1 = require("./modules/rooms/rooms.module");
const laureates_module_1 = require("./modules/laureates/laureates.module");
const activity_logs_module_1 = require("./modules/activity-logs/activity-logs.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const cours_module_1 = require("./modules/cours/cours.module");
const options_module_1 = require("./modules/options/options.module");
const academic_modules_module_1 = require("./modules/academic-modules/academic-modules.module");
const element_modules_module_1 = require("./modules/element-modules/element-modules.module");
const timetable_module_1 = require("./modules/timetable/timetable.module");
const cycles_module_1 = require("./modules/cycles/cycles.module");
const student_observations_module_1 = require("./modules/student-observations/student-observations.module");
const accreditations_module_1 = require("./modules/accreditations/accreditations.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            students_module_1.StudentsModule,
            teachers_module_1.TeachersModule,
            departments_module_1.DepartmentsModule,
            filieres_module_1.FilieresModule,
            classes_module_1.ClassesModule,
            documents_module_1.DocumentsModule,
            workflows_module_1.WorkflowsModule,
            rooms_module_1.RoomsModule,
            laureates_module_1.LaureatesModule,
            activity_logs_module_1.ActivityLogsModule,
            dashboard_module_1.DashboardModule,
            cours_module_1.CoursModule,
            options_module_1.OptionsModule,
            academic_modules_module_1.AcademicModulesModule,
            element_modules_module_1.ElementModulesModule,
            timetable_module_1.TimetableModule,
            cycles_module_1.CyclesModule,
            student_observations_module_1.StudentObservationsModule,
            accreditations_module_1.AccreditationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map