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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { TransferClassDto } from './dto/transfer-class.dto';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { ClassQueryDto } from './dto/class-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { deptScope } from '../../common/utils/dept-scope';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findAll(@Query() query: ClassQueryDto, @CurrentUser() user: JwtPayload) {
    return this.classesService.findAll(query, deptScope(user));
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.classesService.importFromBuffer(file.buffer);
  }

  @Post('import-from-modules')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER, UserRole.INSPECTOR)
  importFromModules(@CurrentUser() user: JwtPayload) {
    return this.classesService.importFromModules(user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.findOne(id);
  }

  @Get(':id/cours')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findCours(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.findCours(id);
  }

  @Get(':id/groups')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.TEACHER, UserRole.INSPECTOR)
  findGroups(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.findGroups(id);
  }

  @Post(':id/groups')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER, UserRole.INSPECTOR)
  createGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClassGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.createGroup(id, dto, user);
  }

  @Delete(':id/groups/:groupId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER, UserRole.INSPECTOR)
  removeGroup(
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.removeGroup(id, groupId, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.INSPECTOR)
  create(@Body() dto: CreateClassDto, @CurrentUser() user: JwtPayload) {
    return this.classesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.INSPECTOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.update(id, dto, user);
  }

  @Post(':id/transfer')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.INSPECTOR)
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.transfer(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER, UserRole.INSPECTOR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.remove(id, user);
  }
}
