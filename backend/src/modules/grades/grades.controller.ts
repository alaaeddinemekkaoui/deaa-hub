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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { GradesService } from './grades.service';
import { GradeQueryDto } from './dto/grade-query.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkUpsertGradesDto } from './dto/bulk-upsert-grades.dto';
import { ImportGradesDto } from './dto/import-grades.dto';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll(@Query() query: GradeQueryDto) {
    return this.gradesService.findAll(query);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.gradesService.findByStudent(studentId);
  }

  @Get('teacher/:teacherId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findByTeacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return this.gradesService.findByTeacher(teacherId);
  }

  @Post('bulk-upsert')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  bulkUpsert(
    @Body() dto: BulkUpsertGradesDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.bulkUpsert(dto, currentUser);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  import(
    @Body() dto: ImportGradesDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.importFromBuffer(dto, file, currentUser);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  create(@Body() dto: CreateGradeDto, @CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.create(dto, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.remove(id, currentUser);
  }
}
