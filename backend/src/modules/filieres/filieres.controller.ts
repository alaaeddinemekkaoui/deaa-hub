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
import { FilieresService } from './filieres.service';
import { CreateFiliereDto } from './dto/create-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';
import { FiliereQueryDto } from './dto/filiere-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { deptScope } from '../../common/utils/dept-scope';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('filieres')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilieresController {
  constructor(private readonly filieresService: FilieresService) {}

  @Get()
  findAll(@Query() query: FiliereQueryDto, @CurrentUser() user: JwtPayload) {
    return this.filieresService.findAll(query, deptScope(user));
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.filieresService.importFromBuffer(file.buffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.filieresService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateFiliereDto) {
    return this.filieresService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFiliereDto) {
    return this.filieresService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.filieresService.remove(id);
  }
}
