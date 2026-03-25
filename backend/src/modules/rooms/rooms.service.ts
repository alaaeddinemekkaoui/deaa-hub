import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.room.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.room.findUnique({ where: { id } });
  }

  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        name: dto.name,
        capacity: dto.capacity,
        equipment: dto.equipment,
        availability: dto.availability,
      },
    });
  }

  update(id: number, dto: UpdateRoomDto) {
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.room.delete({ where: { id } });
  }

  async importFromBuffer(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = String(row['name'] ?? row['Nom'] ?? '').trim();
        if (!name) { errors.push(`Row ${i + 2}: name is required`); continue; }
        await this.prisma.room.create({
          data: {
            name,
            capacity: row['capacity'] ? Number(row['capacity']) : 0,
            availability: row['availability'] !== null && row['availability'] !== undefined
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
}
