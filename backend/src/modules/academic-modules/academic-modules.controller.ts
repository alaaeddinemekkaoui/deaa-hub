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
import { AcademicModulesService } from './academic-modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';
import { AssignModuleClassDto } from './dto/assign-module-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { deptScope } from '../../common/utils/dept-scope';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('academic-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicModulesController {
  constructor(private readonly service: AcademicModulesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll(@Query() query: ModuleQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(query, deptScope(user));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  create(@Body() dto: CreateModuleDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }

  @Post(':id/classes')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  assignClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignModuleClassDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.assignClass(id, dto.classId, user);
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  removeClass(
    @Param('id', ParseIntPipe) id: number,
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeClass(id, classId, user);
  }
}
