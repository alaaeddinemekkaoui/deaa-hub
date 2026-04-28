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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CoursResourcesService } from './cours-resources.service';
import { UpdateCoursResourceDto } from './dto/update-cours-resource.dto';
import { UploadCoursResourceDto } from './dto/upload-cours-resource.dto';

const READ_ROLES = [
  UserRole.ADMIN,
  UserRole.STAFF,
  UserRole.VIEWER,
  UserRole.USER,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.INSPECTOR,
];

@Controller('cours-resources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursResourcesController {
  constructor(private readonly coursResourcesService: CoursResourcesService) {}

  private static getTempUploadDir() {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return join(tmpdir(), 'deaa-hub', 'uploads', 'cours-resources-tmp');
    }

    return join(process.cwd(), 'uploads', 'cours-resources-tmp');
  }

  @Get()
  @Roles(...READ_ROLES)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('coursId') coursId?: string,
  ) {
    return this.coursResourcesService.findAll(
      {
        classId: classId ? Number(classId) : undefined,
        coursId: coursId ? Number(coursId) : undefined,
      },
      user,
    );
  }

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_, __, callback) => {
          const uploadDir = CoursResourcesController.getTempUploadDir();
          mkdirSync(uploadDir, { recursive: true });
          callback(null, uploadDir);
        },
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_, file, callback) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ];
        callback(null, allowed.includes(file.mimetype));
      },
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @Body() dto: UploadCoursResourceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coursResourcesService.upload(dto, file, user);
  }

  @Get(':id/inline')
  @Roles(...READ_ROLES)
  inline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.coursResourcesService.download(id, user, res, 'inline');
  }

  @Get(':id/download')
  @Roles(...READ_ROLES)
  download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.coursResourcesService.download(id, user, res, 'attachment');
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCoursResourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coursResourcesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coursResourcesService.remove(id, user);
  }
}
