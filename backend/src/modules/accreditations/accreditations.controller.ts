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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { AccreditationsService } from './accreditations.service';
import { AccreditationPlanQueryDto } from './dto/accreditation-plan-query.dto';
import { CreateAccreditationPlanDto } from './dto/create-accreditation-plan.dto';
import { UpdateAccreditationPlanDto } from './dto/update-accreditation-plan.dto';
import { CreateAccreditationLineDto } from './dto/create-accreditation-line.dto';
import { AssignClassAccreditationDto } from './dto/assign-class-accreditation.dto';

@Controller('accreditations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccreditationsController {
  constructor(private readonly service: AccreditationsService) {}

  @Get('plans')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findPlans(@Query() query: AccreditationPlanQueryDto) {
    return this.service.findPlans(query);
  }

  @Get('plans/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findPlan(@Param('id', ParseIntPipe) id: number) {
    return this.service.findPlan(id);
  }

  @Post('plans')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createPlan(@Body() dto: CreateAccreditationPlanDto) {
    return this.service.createPlan(dto);
  }

  @Patch('plans/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccreditationPlanDto,
  ) {
    return this.service.updatePlan(id, dto);
  }

  @Post('plans/:id/lines')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createLine(
    @Param('id', ParseIntPipe) planId: number,
    @Body() dto: CreateAccreditationLineDto,
  ) {
    return this.service.createLine(planId, dto);
  }

  @Delete('lines/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeLine(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeLine(id);
  }

  @Get('plans/:id/diff')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  diffWithSource(@Param('id', ParseIntPipe) id: number) {
    return this.service.diffWithSource(id);
  }

  @Post('plans/:id/assignments')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  assignPlanToClassYear(
    @Param('id', ParseIntPipe) planId: number,
    @Body() dto: AssignClassAccreditationDto,
  ) {
    return this.service.assignPlanToClassYear(planId, dto);
  }

  @Get('classes/:classId/assignments')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findClassAssignments(@Param('classId', ParseIntPipe) classId: number) {
    return this.service.findClassAssignments(classId);
  }
}
