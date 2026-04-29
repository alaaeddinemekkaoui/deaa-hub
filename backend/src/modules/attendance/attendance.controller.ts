import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { AttendanceService } from './attendance.service';
import { EnableAttendanceDto } from './dto/enable-attendance.dto';
import { ExtendAttendanceDto } from './dto/extend-attendance.dto';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT)
  current(@CurrentUser() user: JwtPayload, @Query('role') role?: string) {
    return this.service.findCurrent(user, role === 'teacher' ? 'teacher' : 'student');
  }

  @Get('sessions/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT)
  session(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.service.getSession(id, user);
  }

  @Get('sessions/:id/records')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  records(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.service.getRecords(id, user);
  }

  @Get('options')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.INSPECTOR)
  options(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('courseId') courseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getOptions(user, {
      classId: classId ? Number(classId) : undefined,
      courseId: courseId ? Number(courseId) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.INSPECTOR)
  overview(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('courseId') courseId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getOverview(user, {
      classId: classId ? Number(classId) : undefined,
      courseId: courseId ? Number(courseId) : undefined,
      sessionId: sessionId ? Number(sessionId) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Post('sessions/:id/enable')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  enable(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnableAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.enable(id, dto, user);
  }

  @Post('sessions/:id/disable')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  disable(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.service.disable(id, user);
  }

  @Post('sessions/:id/extend')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  extend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.extend(id, dto.minutes, user);
  }

  @Post('sessions/:id/manual')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  manual(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManualAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.manual(id, dto, user);
  }

  @Post('scan')
  @Roles(UserRole.STUDENT)
  scan(@Body() dto: ScanAttendanceDto, @CurrentUser() user: JwtPayload) {
    return this.service.scan(dto.token, user);
  }

  @Get('history')
  @Roles(UserRole.STUDENT)
  history(@CurrentUser() user: JwtPayload) {
    return this.service.getStudentHistory(user);
  }
}
