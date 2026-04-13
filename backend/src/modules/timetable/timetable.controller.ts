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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll(@Query() query: SessionQueryDto) {
    return this.service.findAll(query);
  }

  @Get('week')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findWeek(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('weekStart') weekStart: string,
  ) {
    return this.service.findWeek(classId, weekStart);
  }

  @Get('conflicts')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  checkConflicts(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.service.checkConflicts(classId, weekStart);
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
