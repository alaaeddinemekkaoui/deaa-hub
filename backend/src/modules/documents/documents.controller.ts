import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  @Post('upload')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.USER,
    UserRole.INSPECTOR,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_, file, callback) => {
        const allowed = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ];
        callback(null, allowed.includes(file.mimetype));
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.documentsService.create(dto, file, user);
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.STUDENT,
  )
  findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentsService.findByStudentForUser(studentId, user);
  }

  @Get('teacher/:teacherId')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.INSPECTOR,
  )
  findByTeacher(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentsService.findByTeacherForUser(teacherId, user);
  }

  @Get('student/:studentId/missing')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  missing(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.documentsService.missingDocuments(studentId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { name?: string; studentId?: number; teacherId?: number },
  ) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentsService.remove(id, user);
  }

  @Get(':id/file')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.VIEWER,
    UserRole.USER,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.INSPECTOR,
  )
  async serveFile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.documentsService.streamFile(id, res, user);
  }
}
