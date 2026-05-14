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
import { PublishGradesDto } from './dto/publish-grades.dto';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findAll(@Query() query: GradeQueryDto, @CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.findAll(query, currentUser);
  }

  @Get('deliberation/class/:classId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  getDeliberation(
    @Param('classId', ParseIntPipe) classId: number,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('publicationStatus') publicationStatus?: string,
  ) {
    return this.gradesService.getDeliberation(
      classId,
      academicYear,
      semester,
      publicationStatus,
    );
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.gradesService.findByStudent(studentId);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.findMine(currentUser);
  }

  @Get('teacher/:teacherId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findByTeacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return this.gradesService.findByTeacher(teacherId);
  }

  @Post('bulk-upsert')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  bulkUpsert(
    @Body() dto: BulkUpsertGradesDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.bulkUpsert(dto, currentUser);
  }

  @Post('publish')
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  publish(@Body() dto: PublishGradesDto, @CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.publish(dto, currentUser);
  }

  @Post('unpublish')
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  unpublish(@Body() dto: PublishGradesDto, @CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.unpublish(dto, currentUser);
  }

  @Post('reopen')
  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  reopen(@Body() dto: PublishGradesDto, @CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.reopen(dto, currentUser);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
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
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  create(@Body() dto: CreateGradeDto, @CurrentUser() currentUser: JwtPayload) {
    return this.gradesService.create(dto, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.gradesService.remove(id, currentUser);
  }
}
