import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { spawn } from 'child_process';
import { URL } from 'url';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/role.type';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Get('backup/sql')
  @Roles(UserRole.ADMIN)
  async downloadBackup(@Res() res: Response) {
    const rawUrl = process.env.DATABASE_URL ?? '';
    let dbUrl: URL;
    try {
      dbUrl = new URL(rawUrl);
    } catch {
      res.status(500).json({ message: 'DATABASE_URL is not configured.' });
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `deaa-hub-backup-${date}.sql`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const args = [
      '-h',
      dbUrl.hostname,
      '-p',
      dbUrl.port || '5432',
      '-U',
      dbUrl.username,
      '-d',
      dbUrl.pathname.replace(/^\//, ''),
      '--no-password',
      '-F',
      'p',
      '--encoding=UTF8',
    ];

    const dump = spawn('pg_dump', args, {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(dbUrl.password) },
    });

    dump.on('error', (err) => {
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: `pg_dump unavailable: ${err.message}` });
      }
    });

    dump.stderr.on('data', (d: Buffer) =>
      console.error('[pg_dump]', d.toString()),
    );

    dump.stdout.pipe(res);
  }
}
