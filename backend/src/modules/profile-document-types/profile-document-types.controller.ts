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
import { ProfileDocumentTypesService } from './profile-document-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

const ALL_ROLES = [
  UserRole.ADMIN,
  UserRole.STAFF,
  UserRole.VIEWER,
  UserRole.USER,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.INSPECTOR,
];

@Controller('profile-document-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileDocumentTypesController {
  constructor(private readonly service: ProfileDocumentTypesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() body: { name: string; description?: string }) {
    return this.service.create(body.name, body.description);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.service.update(id, body.name, body.description);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
