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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types/role.type';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { RoomReservationsService } from './room-reservations.service';
import { RoomReservationQueryDto } from './dto/room-reservation-query.dto';
import { CreateRoomReservationDto } from './dto/create-room-reservation.dto';
import { UpdateRoomReservationDto } from './dto/update-room-reservation.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

class ApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller('room-reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomReservationsController {
  constructor(private readonly service: RoomReservationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findAll(
    @Query() query: RoomReservationQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER, UserRole.USER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER)
  create(
    @Body() dto: CreateRoomReservationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.create(dto, currentUser);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApprovalDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.approve(id, currentUser, body.note);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.USER)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApprovalDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.reject(id, currentUser, body.note);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomReservationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
