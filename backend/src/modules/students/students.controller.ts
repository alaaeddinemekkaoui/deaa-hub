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
import { Request } from 'express';
import type { Response } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { TransferStudentsDto } from './dto/transfer-students.dto';
import { ProgressStudentsDto } from './dto/progress-students.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, isDeptScoped } from '../../common/types/role.type';
import { StudentsQueryDto } from './dto/students-query.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectStorageService } from '../../common/storage/object-storage.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly storage: ObjectStorageService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll(@Query() query: StudentsQueryDto, @CurrentUser() user: JwtPayload) {
    const departmentIds = isDeptScoped(user.role)
      ? user.departmentIds
      : undefined;
    return this.studentsService.findAll(
      query,
      query.search,
      query.filiereId,
      departmentIds,
      {
        departmentId: query.departmentId,
        classId: query.classId,
        gender: query.gender,
        birthYear: query.birthYear,
        academicYear: query.academicYear,
        entryYear: query.entryYear,
        accountStatus: query.accountStatus,
        laureateStatus: query.laureateStatus,
      },
    );
  }

  @Get('by-class/:classId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: StudentsQueryDto,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    return this.studentsService.findByClass(
      classId,
      pageRaw || limitRaw ? query : undefined,
    );
  }

  @Get('profile-lookup/scan')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.INSPECTOR,
    UserRole.STUDENT,
  )
  lookupProfileQr(
    @Query('code') code: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.lookupProfileQr(code, user);
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
    return this.studentsService.importFromBuffer(file.buffer);
  }

  @Post('transfer')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  transfer(@Body() dto: TransferStudentsDto, @Req() req: AuthRequest) {
    return this.studentsService.transferStudents(dto, req.user.sub);
  }

  @Post('progress')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  progress(@Body() dto: ProgressStudentsDto, @Req() req: AuthRequest) {
    return this.studentsService.progressStudents(dto, req.user.sub);
  }

  @Post(':id/make-laureate')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  makeLaureate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { graduationYear: number },
  ) {
    return this.studentsService.makeLaureate(id, body.graduationYear);
  }

  @Delete(':id/remove-laureate')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeLaureate(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.removeLaureate(id);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.STUDENT,
  )
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.studentsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.remove(id, user);
  }

  /** Create a User account for a single student */
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
    return this.studentsService.createAccount(id, password, user);
  }

  /** Bulk-create accounts for multiple students with a shared default password */
  @Post('bulk-create-accounts')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER)
  bulkCreateAccounts(
    @Body() body: { studentIds: number[]; defaultPassword: string },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.defaultPassword || body.defaultPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
      throw new BadRequestException('studentIds must be a non-empty array');
    }
    return this.studentsService.bulkCreateAccounts(
      body.studentIds,
      body.defaultPassword,
      user,
    );
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
      folder: `students/${id}`,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxSizeBytes: 5 * 1024 * 1024,
    });
    return this.studentsService.updatePhoto(id, stored.reference);
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
    const photoPath = await this.studentsService.getPhotoPath(id);
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
