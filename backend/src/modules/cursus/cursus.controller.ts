import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CursusService } from './cursus.service';
import { UpdateCursusDto } from './dto/update-cursus.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('cursus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CursusController {
  constructor(private readonly service: CursusService) {}

  @Get('class/:classId/year/:academicYearId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findForClassAndYear(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.service.getCursusForClassAndYear(classId, academicYearId);
  }

  @Patch('class/:classId/year/:academicYearId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER, UserRole.INSPECTOR)
  updateForClassAndYear(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
    @Body() dto: UpdateCursusDto,
  ) {
    return this.service.updateCursusForClassAndYear(
      classId,
      academicYearId,
      dto,
    );
  }

  @Get(':id/can-edit-directly')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  canEditDirectly(@Param('id', ParseIntPipe) id: number) {
    return this.service.canEditCursusDirectly(id);
  }

  @Post(':id/duplicate-for-year/:academicYearId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER, UserRole.INSPECTOR)
  duplicateForYear(
    @Param('id', ParseIntPipe) id: number,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.service.duplicateCursusForYear(id, academicYearId);
  }
}
