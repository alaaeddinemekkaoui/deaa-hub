import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { InfrastructureModule } from './common/infrastructure.module';
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
import { RoomReservationsModule } from './modules/room-reservations/room-reservations.module';
import { GradesModule } from './modules/grades/grades.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { DocumentTypesModule } from './modules/document-types/document-types.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RestaurationModule } from './modules/restauration/restauration.module';
import { CoursResourcesModule } from './modules/cours-resources/cours-resources.module';
import { ProfileDocumentTypesModule } from './modules/profile-document-types/profile-document-types.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { InternatModule } from './modules/internat/internat.module';
import { CursusModule } from './modules/cursus/cursus.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10000 }]),
    InfrastructureModule,
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
    RoomReservationsModule,
    GradesModule,
    AcademicYearsModule,
    DocumentTypesModule,
    MessagingModule,
    NotificationsModule,
    RestaurationModule,
    CoursResourcesModule,
    ProfileDocumentTypesModule,
    AttendanceModule,
    AnalyticsModule,
    InternatModule,
    CursusModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
