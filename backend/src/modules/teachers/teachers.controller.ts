import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

type AuthRequest = Request & { user: JwtPayload };
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { CreateTeacherRoleDto } from './dto/create-teacher-role.dto';
import { UpdateTeacherRoleDto } from './dto/update-teacher-role.dto';
import { CreateTeacherGradeDto } from './dto/create-teacher-grade.dto';
import { UpdateTeacherGradeDto } from './dto/update-teacher-grade.dto';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll(@Query() query: TeacherQueryDto) {
    return this.teachersService.findAll(query);
  }

  @Get('roles')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findRoles() {
    return this.teachersService.findRoles();
  }

  @Post('roles')
  @Roles(UserRole.ADMIN)
  createRole(@Body() dto: CreateTeacherRoleDto) {
    return this.teachersService.createRole(dto);
  }

  @Patch('roles/:id')
  @Roles(UserRole.ADMIN)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherRoleDto,
  ) {
    return this.teachersService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @Roles(UserRole.ADMIN)
  removeRole(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.removeRole(id);
  }

  @Get('grades')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findGrades() {
    return this.teachersService.findGrades();
  }

  @Post('grades')
  @Roles(UserRole.ADMIN)
  createGrade(@Body() dto: CreateTeacherGradeDto) {
    return this.teachersService.createGrade(dto);
  }

  @Patch('grades/:id')
  @Roles(UserRole.ADMIN)
  updateGrade(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherGradeDto,
  ) {
    return this.teachersService.updateGrade(id, dto);
  }

  @Delete('grades/:id')
  @Roles(UserRole.ADMIN)
  removeGrade(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.removeGrade(id);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  importFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.teachersService.importFromBuffer(file.buffer);
  }

  @Get(':id/class-logs')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findClassLogs(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findClassLogs(id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherDto,
    @Req() req: AuthRequest,
  ) {
    return this.teachersService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.remove(id);
  }
}
