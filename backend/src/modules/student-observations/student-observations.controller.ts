import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StudentObservationsService } from './student-observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('students/:studentId/observations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentObservationsController {
  constructor(private readonly service: StudentObservationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.findAll(studentId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: CreateObservationDto,
  ) {
    return this.service.create(studentId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(studentId, id);
  }
}
