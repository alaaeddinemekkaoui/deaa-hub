import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';

@Injectable()
export class StudentObservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(studentId: number) {
    await this.ensureStudentExists(studentId);
    return this.prisma.studentObservation.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForUser(studentId: number, user: JwtPayload) {
    if (user.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      if (!student || student.userId !== user.sub) {
        throw new ForbiddenException('Vous ne pouvez consulter que vos propres observations');
      }
    }

    return this.findAll(studentId);
  }

  async create(studentId: number, dto: CreateObservationDto) {
    await this.ensureStudentExists(studentId);
    return this.prisma.studentObservation.create({
      data: { studentId, text: dto.text },
    });
  }

  async remove(studentId: number, id: number) {
    const obs = await this.prisma.studentObservation.findFirst({
      where: { id, studentId },
      select: { id: true },
    });
    if (!obs)
      throw new NotFoundException(
        `Observation ${id} not found for student ${studentId}`,
      );
    return this.prisma.studentObservation.delete({ where: { id } });
  }

  private async ensureStudentExists(id: number) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!s) throw new NotFoundException(`Student ${id} not found`);
  }
}
