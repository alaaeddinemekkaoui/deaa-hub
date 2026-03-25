import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLaureateDto } from './dto/create-laureate.dto';
import { UpdateLaureateDto } from './dto/update-laureate.dto';

@Injectable()
export class LaureatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.laureate.findMany({
      include: {
        student: {
          include: { filiere: true },
        },
        proofDocument: true,
      },
      orderBy: { graduationYear: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.laureate.findUnique({
      where: { id },
      include: {
        student: { include: { filiere: true } },
        proofDocument: true,
      },
    });
  }

  /** Students not yet in the laureates table, with optional name search. */
  async findNonLaureateStudents(search?: string) {
    const laureateStudentIds = await this.prisma.laureate
      .findMany({ select: { studentId: true } })
      .then((rows) => rows.map((r) => r.studentId));

    return this.prisma.student.findMany({
      where: {
        id: { notIn: laureateStudentIds.length ? laureateStudentIds : [-1] },
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { codeMassar: { contains: search, mode: 'insensitive' } },
                { cin: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        codeMassar: true,
        filiere: { select: { name: true } },
        academicClass: { select: { name: true } },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });
  }

  async create(dto: CreateLaureateDto, userId?: number) {
    const existing = await this.prisma.laureate.findUnique({
      where: { studentId: dto.studentId },
    });
    if (existing) {
      throw new ConflictException(
        `Student ${dto.studentId} is already a laureate`,
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, fullName: true },
    });
    if (!student) {
      throw new NotFoundException(`Student ${dto.studentId} not found`);
    }

    const laureate = await this.prisma.laureate.create({
      data: {
        studentId: dto.studentId,
        graduationYear: dto.graduationYear,
        diplomaStatus: dto.diplomaStatus ?? 'not_retrieved',
        proofDocumentId: dto.proofDocumentId ?? null,
      },
    });

    if (userId) {
      await this.log(userId, `Added laureate: ${student.fullName} (${dto.graduationYear})`, {
        laureateId: laureate.id,
        studentId: dto.studentId,
        studentName: student.fullName,
        graduationYear: dto.graduationYear,
        diplomaStatus: laureate.diplomaStatus,
      });
    }

    return laureate;
  }

  async update(id: number, dto: UpdateLaureateDto, userId?: number) {
    const existing = await this.prisma.laureate.findUnique({
      where: { id },
      include: { student: { select: { fullName: true } } },
    });
    if (!existing) throw new NotFoundException(`Laureate ${id} not found`);

    const updated = await this.prisma.laureate.update({ where: { id }, data: dto });

    if (userId) {
      await this.log(userId, `Updated laureate: ${existing.student.fullName}`, {
        laureateId: id,
        changes: dto,
      });
    }

    return updated;
  }

  async remove(id: number, userId?: number) {
    const existing = await this.prisma.laureate.findUnique({
      where: { id },
      include: { student: { select: { fullName: true } } },
    });
    if (!existing) throw new NotFoundException(`Laureate ${id} not found`);

    const deleted = await this.prisma.laureate.delete({ where: { id } });

    if (userId) {
      await this.log(userId, `Removed laureate: ${existing.student.fullName}`, {
        laureateId: id,
        studentName: existing.student.fullName,
      });
    }

    return deleted;
  }

  async importFromBuffer(
    buffer: Buffer,
    userId?: number,
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
        const studentId = Number(row['studentId'] ?? 0);
        const graduationYear = Number(
          row['graduationYear'] ?? new Date().getFullYear(),
        );
        if (!studentId) {
          errors.push(`Row ${i + 2}: studentId is required`);
          continue;
        }
        const diplomaRaw = String(row['diplomaStatus'] ?? 'not_retrieved');
        const diplomaStatus: 'retrieved' | 'not_retrieved' = [
          'retrieved',
          'not_retrieved',
        ].includes(diplomaRaw)
          ? (diplomaRaw as 'retrieved' | 'not_retrieved')
          : 'not_retrieved';

        await this.create({ studentId, graduationYear, diplomaStatus }, userId);
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    if (userId && imported > 0) {
      await this.log(userId, `Bulk imported ${imported} laureate(s)`, {
        imported,
        errorCount: errors.length,
      });
    }

    return { imported, errors };
  }

  private log(
    userId: number,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    return this.prisma.activityLog.create({
      data: { userId, action, metadata: metadata as never },
    });
  }
}
