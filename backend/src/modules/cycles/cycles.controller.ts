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
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('cycles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll() {
    return this.cyclesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateCycleDto) {
    return this.cyclesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCycleDto) {
    return this.cyclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cyclesService.remove(id);
  }
}
