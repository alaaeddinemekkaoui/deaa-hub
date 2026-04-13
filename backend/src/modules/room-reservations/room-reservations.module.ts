import { Module } from '@nestjs/common';
import { RoomReservationsController } from './room-reservations.controller';
import { RoomReservationsService } from './room-reservations.service';

@Module({
  controllers: [RoomReservationsController],
  providers: [RoomReservationsService],
  exports: [RoomReservationsService],
})
export class RoomReservationsModule {}
