import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { TimetableHolidayDto } from './dto/timetable-holiday.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { deptScope } from '../../common/utils/dept-scope';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.STUDENT, UserRole.INSPECTOR)
  findAll(@Query() query: SessionQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, deptScope(user));
  }

  @Get('week')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.STUDENT, UserRole.INSPECTOR)
  findWeek(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('weekStart') weekStart: string,
  ) {
    return this.service.findWeek(classId, weekStart);
  }

  @Get('conflicts')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.STUDENT, UserRole.INSPECTOR)
  checkConflicts(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.service.checkConflicts(classId, weekStart);
  }

  @Get('holidays')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.STUDENT, UserRole.INSPECTOR)
  findHolidays() {
    return this.service.findHolidays();
  }

  @Post('holidays')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createHoliday(@Body() dto: TimetableHolidayDto) {
    return this.service.createHoliday(dto);
  }

  @Patch('holidays/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateHoliday(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TimetableHolidayDto,
  ) {
    return this.service.updateHoliday(id, dto);
  }

  @Delete('holidays/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeHoliday(id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.STUDENT, UserRole.INSPECTOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneDetailed(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateSessionDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
