import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { InternatService } from './internat.service';
import { CreateInternatRoomDto } from './dto/create-internat-room.dto';
import { UpdateInternatRoomDto } from './dto/update-internat-room.dto';
import { CreateInternatAssignmentDto } from './dto/create-internat-assignment.dto';
import { UpdateInternatAssignmentDto } from './dto/update-internat-assignment.dto';

@Controller('internat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.INTERNAT)
export class InternatController {
  constructor(private readonly internatService: InternatService) {}

  @Get('rooms')
  findRooms() {
    return this.internatService.findRooms();
  }

  @Post('rooms')
  createRoom(@Body() dto: CreateInternatRoomDto) {
    return this.internatService.createRoom(dto);
  }

  @Post('rooms/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importRooms(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.internatService.importRoomsFromBuffer(file.buffer);
  }

  @Patch('rooms/:id')
  updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInternatRoomDto,
  ) {
    return this.internatService.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  removeRoom(@Param('id', ParseIntPipe) id: number) {
    return this.internatService.removeRoom(id);
  }

  @Get('students')
  findStudents(@Query('search') search?: string) {
    return this.internatService.findStudents(search);
  }

  @Get('assignments')
  findAssignments() {
    return this.internatService.findAssignments();
  }

  @Post('assignments')
  upsertAssignment(@Body() dto: CreateInternatAssignmentDto) {
    return this.internatService.upsertAssignment(dto);
  }

  @Patch('assignments/:id')
  updateAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInternatAssignmentDto,
  ) {
    return this.internatService.updateAssignment(id, dto);
  }

  @Delete('assignments/:id')
  removeAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.internatService.removeAssignment(id);
  }
}
