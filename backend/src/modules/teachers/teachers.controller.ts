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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
import { ObjectStorageService } from '../../common/storage/object-storage.service';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly storage: ObjectStorageService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll(@Query() query: TeacherQueryDto) {
    return this.teachersService.findAll(query);
  }

  @Get('roles')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
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
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
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

  @Post('bulk-create-accounts')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER)
  bulkCreateAccounts(
    @Body() body: { teacherIds: number[]; defaultPassword: string },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.defaultPassword || body.defaultPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    if (!Array.isArray(body.teacherIds) || body.teacherIds.length === 0) {
      throw new BadRequestException('teacherIds must be a non-empty array');
    }
    return this.teachersService.bulkCreateAccounts(
      body.teacherIds,
      body.defaultPassword,
      user,
    );
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
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.INSPECTOR,
  )
  findClassLogs(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findClassLogs(id);
  }

  @Get(':id/cours')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.INSPECTOR,
  )
  findCours(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findCours(id);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.INSPECTOR,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  create(@Body() dto: CreateTeacherDto, @CurrentUser() user: JwtPayload) {
    return this.teachersService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachersService.remove(id, user);
  }

  @Post(':id/create-account')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER)
  createAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    return this.teachersService.createAccount(id, password, user);
  }

  @Post(':id/photo')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.INSPECTOR,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_, file, cb) => cb(null, file.mimetype.startsWith('image/')),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No image uploaded');
    const stored = await this.storage.uploadBuffer({
      bucketName: 'profileImages',
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `teachers/${id}`,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxSizeBytes: 5 * 1024 * 1024,
    });
    return this.teachersService.updatePhoto(id, stored.reference);
  }

  @Get(':id/photo')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.INSPECTOR,
  )
  async getPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const photoPath = await this.teachersService.getPhotoPath(id);
    if (!photoPath) {
      return res.status(404).json({ message: 'No photo' });
    }
    if (this.storage.parseReference(photoPath)) {
      const ext = photoPath.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
      res.setHeader('Content-Type', mime);
      return (await this.storage.getObject(photoPath)).pipe(res);
    }
    if (!existsSync(photoPath)) {
      return res.status(404).json({ message: 'No photo' });
    }
    const ext = photoPath.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    createReadStream(photoPath).pipe(res);
  }
}
