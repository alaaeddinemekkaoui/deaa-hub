import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInternatRoomDto } from './dto/create-internat-room.dto';
import { UpdateInternatRoomDto } from './dto/update-internat-room.dto';
import { CreateInternatAssignmentDto } from './dto/create-internat-assignment.dto';
import { UpdateInternatAssignmentDto } from './dto/update-internat-assignment.dto';

@Injectable()
export class InternatService {
  constructor(private readonly prisma: PrismaService) {}

  findRooms() {
    return this.prisma.internatRoom.findMany({
      include: {
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                codeMassar: true,
                codeEtudiant: true,
                academicClass: {
                  select: {
                    id: true,
                    name: true,
                    year: true,
                  },
                },
              },
            },
          },
          orderBy: {
            student: {
              fullName: 'asc',
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRoom(dto: CreateInternatRoomDto) {
    return this.prisma.internatRoom.create({
      data: {
        name: dto.name.trim(),
        capacity: dto.capacity,
      },
    });
  }

  async importRoomsFromBuffer(
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
        const rawName = row['name'] ?? row['Nom'];
        const name =
          typeof rawName === 'string' || typeof rawName === 'number'
            ? String(rawName).trim()
            : '';
        const capacityValue =
          row['capacity'] ?? row['Capacité'] ?? row['Capacite'];

        if (!name) {
          errors.push(`Row ${i + 2}: name is required`);
          continue;
        }

        const capacity =
          capacityValue === null ||
          capacityValue === undefined ||
          (typeof capacityValue === 'string' && capacityValue.trim() === '')
            ? 2
            : Number(capacityValue);

        if (!Number.isFinite(capacity) || capacity < 1) {
          errors.push(`Row ${i + 2}: capacity must be a number greater than 0`);
          continue;
        }

        await this.prisma.internatRoom.create({
          data: {
            name,
            capacity,
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

  async updateRoom(id: number, dto: UpdateInternatRoomDto) {
    const room = await this.ensureRoomExists(id);
    const occupancy = await this.prisma.internatAssignment.count({
      where: { roomId: id },
    });

    if (dto.capacity !== undefined && dto.capacity < occupancy) {
      throw new ConflictException(
        `La capacité ne peut pas être inférieure à l'occupation actuelle (${occupancy}).`,
      );
    }

    return this.prisma.internatRoom.update({
      where: { id: room.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });
  }

  async removeRoom(id: number) {
    await this.ensureRoomExists(id);
    const occupancy = await this.prisma.internatAssignment.count({
      where: { roomId: id },
    });

    if (occupancy > 0) {
      throw new ConflictException(
        'Impossible de supprimer une chambre qui contient encore des étudiants.',
      );
    }

    return this.prisma.internatRoom.delete({ where: { id } });
  }

  findStudents(search?: string) {
    return this.prisma.student.findMany({
      where: search?.trim()
        ? {
            OR: [
              { fullName: { contains: search.trim() } },
              { codeMassar: { contains: search.trim() } },
              { codeEtudiant: { contains: search.trim() } },
              { cin: { contains: search.trim() } },
            ],
          }
        : undefined,
      select: {
        id: true,
        fullName: true,
        codeMassar: true,
        codeEtudiant: true,
        academicClass: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        internatAssignment: {
          select: {
            id: true,
            roomId: true,
            comment: true,
            room: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
      take: 300,
    });
  }

  findAssignments() {
    return this.prisma.internatAssignment.findMany({
      include: {
        room: true,
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            codeEtudiant: true,
            academicClass: {
              select: {
                id: true,
                name: true,
                year: true,
              },
            },
          },
        },
      },
      orderBy: {
        student: {
          fullName: 'asc',
        },
      },
    });
  }

  async upsertAssignment(dto: CreateInternatAssignmentDto) {
    await this.ensureStudentExists(dto.studentId);
    await this.ensureRoomCapacity(dto.roomId, dto.studentId);

    return this.prisma.internatAssignment.upsert({
      where: { studentId: dto.studentId },
      update: {
        roomId: dto.roomId,
        comment: dto.comment?.trim() || null,
      },
      create: {
        studentId: dto.studentId,
        roomId: dto.roomId,
        comment: dto.comment?.trim() || null,
      },
      include: {
        room: true,
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            codeEtudiant: true,
            academicClass: {
              select: {
                id: true,
                name: true,
                year: true,
              },
            },
          },
        },
      },
    });
  }

  async updateAssignment(id: number, dto: UpdateInternatAssignmentDto) {
    const assignment = await this.prisma.internatAssignment.findUnique({
      where: { id },
      select: { id: true, roomId: true, studentId: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Affectation ${id} introuvable.`);
    }

    const nextRoomId = dto.roomId ?? assignment.roomId;
    await this.ensureRoomCapacity(
      nextRoomId,
      assignment.studentId,
      assignment.id,
    );

    return this.prisma.internatAssignment.update({
      where: { id },
      data: {
        ...(dto.roomId !== undefined ? { roomId: dto.roomId } : {}),
        ...(dto.comment !== undefined
          ? { comment: dto.comment.trim() || null }
          : {}),
      },
      include: {
        room: true,
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            codeEtudiant: true,
            academicClass: {
              select: {
                id: true,
                name: true,
                year: true,
              },
            },
          },
        },
      },
    });
  }

  async removeAssignment(id: number) {
    const assignment = await this.prisma.internatAssignment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Affectation ${id} introuvable.`);
    }

    return this.prisma.internatAssignment.delete({ where: { id } });
  }

  private async ensureRoomCapacity(
    roomId: number,
    studentId: number,
    assignmentId?: number,
  ) {
    const room = await this.prisma.internatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        capacity: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Chambre ${roomId} introuvable.`);
    }

    const occupancy = await this.prisma.internatAssignment.count({
      where: {
        roomId,
        ...(assignmentId ? { id: { not: assignmentId } } : {}),
        studentId: { not: studentId },
      },
    });

    if (occupancy >= room.capacity) {
      throw new ConflictException(
        'Cette chambre a atteint sa capacité maximale.',
      );
    }
  }

  private async ensureStudentExists(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException(`Étudiant ${studentId} introuvable.`);
    }
  }

  private async ensureRoomExists(roomId: number) {
    const room = await this.prisma.internatRoom.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!room) {
      throw new NotFoundException(`Chambre ${roomId} introuvable.`);
    }

    return room;
  }
}
