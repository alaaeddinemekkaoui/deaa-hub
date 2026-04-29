import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INSPECTOR, UserRole.STUDENT)
  async findAll(@CurrentUser() payload: JwtPayload) {
    if (payload.role === UserRole.ADMIN) {
      return this.workflowsService.findAll(undefined, payload);
    }
    if (payload.role === UserRole.STUDENT) {
      return this.workflowsService.findAll(undefined, payload);
    }
    const depts = await this.usersService.getUserDepartments(payload.sub);
    const ids = depts.map((d) => d.id);
    return this.workflowsService.findAll(ids, payload);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.INSPECTOR, UserRole.STUDENT)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() payload: JwtPayload) {
    return this.workflowsService.findOne(id, payload);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  create(@Body() dto: CreateWorkflowDto, @CurrentUser() payload: JwtPayload) {
    return this.workflowsService.create({
      ...dto,
      assignedToId: dto.assignedToId ?? payload.sub,
    }, payload);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INSPECTOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() payload: JwtPayload,
  ) {
    return this.workflowsService.update(id, dto, payload);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workflowsService.remove(id);
  }
}
