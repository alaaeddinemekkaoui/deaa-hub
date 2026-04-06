import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AcademicModulesService } from './academic-modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';
import { AssignModuleClassDto } from './dto/assign-module-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('academic-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicModulesController {
  constructor(private readonly service: AcademicModulesService) {}

  @Get() @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll(@Query() query: ModuleQueryDto) { return this.service.findAll(query); }

  @Get(':id') @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateModuleDto) { return this.service.create(dto); }

  @Patch(':id') @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModuleDto) { return this.service.update(id, dto); }

  @Delete(':id') @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }

  @Post(':id/classes') @Roles(UserRole.ADMIN, UserRole.STAFF)
  assignClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignModuleClassDto,
  ) { return this.service.assignClass(id, dto.classId); }

  @Delete(':id/classes/:classId') @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeClass(
    @Param('id', ParseIntPipe) id: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) { return this.service.removeClass(id, classId); }
}
