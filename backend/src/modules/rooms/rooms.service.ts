import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole, isDeptScoped } from '../../common/types/role.type';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(departmentIds?: number[]) {
    const where =
      departmentIds !== undefined
        ? { departmentId: { in: departmentIds } }
        : undefined;

    return this.prisma.room.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.room.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  create(dto: CreateRoomDto, currentUser?: JwtPayload) {
    this.ensureCanManageDepartment(dto.departmentId, currentUser);

    return this.prisma.room.create({
      data: {
        name: dto.name,
        departmentId: dto.departmentId,
        capacity: dto.capacity,
        equipment: dto.equipment,
        availability: dto.availability,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdateRoomDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.room.findUnique({
      where: { id },
      select: { id: true, departmentId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Room ${id} not found`);
    }

    const nextDepartmentId =
      dto.departmentId !== undefined ? dto.departmentId : existing.departmentId;
    this.ensureCanManageDepartment(nextDepartmentId, currentUser);

    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(id: number, currentUser?: JwtPayload) {
    const existing = await this.prisma.room.findUnique({
      where: { id },
      select: { id: true, departmentId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Room ${id} not found`);
    }

    this.ensureCanManageDepartment(existing.departmentId, currentUser);

    return this.prisma.room.delete({ where: { id } });
  }

  async importFromBuffer(
    buffer: Buffer,
  ): Promise<{ imported: number; errors: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = String(row['name'] ?? row['Nom'] ?? '').trim();
        if (!name) {
          errors.push(`Row ${i + 2}: name is required`);
          continue;
        }
        await this.prisma.room.create({
          data: {
            name,
            capacity: row['capacity'] ? Number(row['capacity']) : 0,
            departmentId: row['departmentId']
              ? Number(row['departmentId'])
              : undefined,
            availability:
              row['availability'] !== null && row['availability'] !== undefined
                ? String(row['availability']).toLowerCase() !== 'false'
                : true,
            equipment: row['equipment'] ?? undefined,
          },
        });
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    return { imported, errors };
  }

  private ensureCanManageDepartment(
    departmentId: number | null | undefined,
    currentUser?: JwtPayload,
  ) {
    if (
      !currentUser ||
      (!isDeptScoped(currentUser.role as UserRole) &&
        currentUser.role !== UserRole.VIEWER)
    ) {
      return;
    }

    if (!departmentId || !currentUser.departmentIds.includes(departmentId)) {
      throw new ForbiddenException(
        'You can only manage rooms in your own department',
      );
    }
  }
}
