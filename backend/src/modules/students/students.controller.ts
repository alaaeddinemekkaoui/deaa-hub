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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { TransferStudentsDto } from './dto/transfer-students.dto';
import { ProgressStudentsDto } from './dto/progress-students.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { StudentsQueryDto } from './dto/students-query.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type AuthRequest = Request & { user: JwtPayload };

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll(@Query() query: StudentsQueryDto) {
    return this.studentsService.findAll(query, query.search, query.filiereId);
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
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
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
}
