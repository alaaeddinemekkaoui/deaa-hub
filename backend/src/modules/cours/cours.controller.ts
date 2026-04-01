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
import { CoursService } from './cours.service';
import { CreateCoursDto } from './dto/create-cours.dto';
import { UpdateCoursDto } from './dto/update-cours.dto';
import { CoursQueryDto } from './dto/cours-query.dto';
import { AssignCoursClassDto } from './dto/assign-cours-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('cours')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursController {
  constructor(private readonly coursService: CoursService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll(@Query() query: CoursQueryDto) {
    return this.coursService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateCoursDto) {
    return this.coursService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCoursDto) {
    return this.coursService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursService.remove(id);
  }

  @Post(':id/classes')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  assignToClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCoursClassDto,
  ) {
    return this.coursService.assignToClass(id, dto);
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeFromClass(
    @Param('id', ParseIntPipe) id: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    return this.coursService.removeFromClass(id, classId);
  }

  @Post('import-from-class/:classId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  importFromClass(@Param('classId', ParseIntPipe) classId: number) {
    return this.coursService.importFromClass(classId);
  }
}
