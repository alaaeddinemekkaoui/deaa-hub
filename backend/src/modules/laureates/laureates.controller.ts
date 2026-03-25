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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { LaureatesService } from './laureates.service';
import { CreateLaureateDto } from './dto/create-laureate.dto';
import { UpdateLaureateDto } from './dto/update-laureate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

type AuthRequest = Request & { user: JwtPayload };

@Controller('laureates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaureatesController {
  constructor(private readonly laureatesService: LaureatesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findAll() {
    return this.laureatesService.findAll();
  }

  @Get('non-laureates')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findNonLaureateStudents(@Query('search') search?: string) {
    return this.laureatesService.findNonLaureateStudents(search);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  importFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.laureatesService.importFromBuffer(file.buffer, req.user.sub);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.laureatesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateLaureateDto, @Req() req: AuthRequest) {
    return this.laureatesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLaureateDto,
    @Req() req: AuthRequest,
  ) {
    return this.laureatesService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.laureatesService.remove(id, req.user.sub);
  }
}
