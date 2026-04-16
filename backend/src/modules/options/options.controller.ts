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
import { OptionsService } from './options.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionQueryDto } from './dto/option-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('options')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get()
  findAll(@Query() query: OptionQueryDto) {
    return this.optionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.optionsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateOptionDto) {
    return this.optionsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOptionDto) {
    return this.optionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.optionsService.remove(id);
  }
}
