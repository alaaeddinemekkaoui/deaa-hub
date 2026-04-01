import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { FilieresModule } from './modules/filieres/filieres.module';
import { ClassesModule } from './modules/classes/classes.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { LaureatesModule } from './modules/laureates/laureates.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CoursModule } from './modules/cours/cours.module';
import { OptionsModule } from './modules/options/options.module';
import { AcademicModulesModule } from './modules/academic-modules/academic-modules.module';
import { ElementModulesModule } from './modules/element-modules/element-modules.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { StudentObservationsModule } from './modules/student-observations/student-observations.module';
import { AccreditationsModule } from './modules/accreditations/accreditations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    DepartmentsModule,
    FilieresModule,
    ClassesModule,
    DocumentsModule,
    WorkflowsModule,
    RoomsModule,
    LaureatesModule,
    ActivityLogsModule,
    DashboardModule,
    CoursModule,
    OptionsModule,
    AcademicModulesModule,
    ElementModulesModule,
    TimetableModule,
    CyclesModule,
    StudentObservationsModule,
    AccreditationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
