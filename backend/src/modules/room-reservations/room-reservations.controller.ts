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
import { RoomReservationsService } from './room-reservations.service';
import { RoomReservationQueryDto } from './dto/room-reservation-query.dto';
import { CreateRoomReservationDto } from './dto/create-room-reservation.dto';
import { UpdateRoomReservationDto } from './dto/update-room-reservation.dto';

@Controller('room-reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomReservationsController {
  constructor(private readonly service: RoomReservationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll(@Query() query: RoomReservationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateRoomReservationDto) {
    return this.service.create(dto);
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
