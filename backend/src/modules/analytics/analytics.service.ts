import { Injectable } from '@nestjs/common';
import { AttendanceStatus, Prisma, Sex } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

type AnalyticsQuery = Record<string, string | undefined>;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: AnalyticsQuery) {
    const studentWhere = this.studentWhere(query);
    const attendanceWhere = this.attendanceWhere(query);

    const [students, records, teachers, classes] = await Promise.all([
      this.prisma.student.findMany({
        where: studentWhere,
        select: {
          id: true,
          fullName: true,
          sex: true,
          filiere: { select: { id: true, name: true } },
          academicClass: { select: { id: true, name: true } },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: attendanceWhere,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              sex: true,
              filiere: { select: { id: true, name: true } },
              academicClass: { select: { id: true, name: true } },
            },
          },
          course: { select: { id: true, name: true } },
          session: {
            select: {
              id: true,
              attendanceEnabledAt: true,
              teacher: { select: { id: true, firstName: true, lastName: true } },
              class: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.teacher.count(),
      this.prisma.academicClass.count(),
    ]);

    const byFiliere = new Map<string, number>();
    const byClass = new Map<string, number>();
    const gender = new Map<string, number>([
      ['male', 0],
      ['female', 0],
    ]);

    for (const student of students) {
      byFiliere.set(student.filiere?.name ?? 'Non assignée', (byFiliere.get(student.filiere?.name ?? 'Non assignée') ?? 0) + 1);
      byClass.set(student.academicClass?.name ?? 'Non assignée', (byClass.get(student.academicClass?.name ?? 'Non assignée') ?? 0) + 1);
      gender.set(student.sex, (gender.get(student.sex) ?? 0) + 1);
    }

    const present = records.filter((r) => r.status === AttendanceStatus.present).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.absent).length;
    const pending = records.filter((r) => r.status === AttendanceStatus.pending).length;
    const decided = present + absent;

    return {
      metrics: {
        totalStudents: students.length,
        teachersCount: teachers,
        classesCount: classes,
        attendanceRate: decided ? Math.round((present / decided) * 1000) / 10 : 0,
        present,
        absent,
        pending,
      },
      studentsPerFiliere: this.mapToChart(byFiliere, 'filiere'),
      studentsPerClass: this.mapToChart(byClass, 'className'),
      genderDistribution: this.mapToChart(gender, 'gender'),
      attendanceByStatus: [
        { status: 'present', total: present },
        { status: 'absent', total: absent },
        { status: 'pending', total: pending },
      ],
      attendanceByClass: this.attendanceRate(records, (record) => record.session.class.name),
      attendanceByCourse: this.attendanceRate(records, (record) => record.course?.name ?? 'Sans cours'),
      attendanceTrends: this.trends(records),
      mostAbsentStudents: this.rankStudents(records, AttendanceStatus.absent),
      mostActiveStudents: this.rankStudents(records, AttendanceStatus.present),
      teacherCompliance: this.teacherCompliance(records),
      insights: this.insights(records),
    };
  }

  private studentWhere(query: AnalyticsQuery): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {};
    if (query.gender === Sex.male || query.gender === Sex.female) where.sex = query.gender;
    if (query.filiereId) where.filiereId = Number(query.filiereId);
    if (query.classId) where.classId = Number(query.classId);
    if (query.departmentId) where.filiere = { departmentId: Number(query.departmentId) };
    return where;
  }

  private attendanceWhere(query: AnalyticsQuery): Prisma.AttendanceRecordWhereInput {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (query.status && ['present', 'absent', 'pending'].includes(query.status)) {
      where.status = query.status as AttendanceStatus;
    }
    if (query.courseId) where.courseId = Number(query.courseId);
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(`${query.endDate}T23:59:59.999`);
    }
    const studentFilters = this.studentWhere(query);
    if (Object.keys(studentFilters).length > 0) where.student = studentFilters;
    return where;
  }

  private mapToChart(map: Map<string, number>, key: string) {
    return Array.from(map.entries())
      .map(([name, total]) => ({ [key]: name, total }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  }

  private attendanceRate<T extends { status: AttendanceStatus }>(records: T[], keyOf: (record: T) => string) {
    const map = new Map<string, { present: number; absent: number; pending: number }>();
    for (const record of records) {
      const key = keyOf(record);
      const current = map.get(key) ?? { present: 0, absent: 0, pending: 0 };
      current[record.status] += 1;
      map.set(key, current);
    }
    return Array.from(map.entries()).map(([name, value]) => {
      const decided = value.present + value.absent;
      return { name, ...value, rate: decided ? Math.round((value.present / decided) * 1000) / 10 : 0 };
    });
  }

  private trends(records: Array<{ status: AttendanceStatus; createdAt: Date }>) {
    const map = new Map<string, { present: number; absent: number; pending: number }>();
    for (const record of records) {
      const day = record.createdAt.toISOString().slice(0, 10);
      const current = map.get(day) ?? { present: 0, absent: 0, pending: 0 };
      current[record.status] += 1;
      map.set(day, current);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, ...value }));
  }

  private rankStudents(records: Array<{ status: AttendanceStatus; student: { id: number; fullName: string } }>, status: AttendanceStatus) {
    const map = new Map<number, { studentId: number; name: string; total: number }>();
    for (const record of records.filter((r) => r.status === status)) {
      const current = map.get(record.student.id) ?? { studentId: record.student.id, name: record.student.fullName, total: 0 };
      current.total += 1;
      map.set(record.student.id, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }

  private teacherCompliance(records: Array<{ session: { teacher: { id: number; firstName: string; lastName: string } | null } }>) {
    const map = new Map<number, { teacherId: number; name: string; records: number }>();
    for (const record of records) {
      const teacher = record.session.teacher;
      if (!teacher) continue;
      const current = map.get(teacher.id) ?? { teacherId: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`, records: 0 };
      current.records += 1;
      map.set(teacher.id, current);
    }
    return Array.from(map.values()).sort((a, b) => b.records - a.records).slice(0, 10);
  }

  private insights(records: Array<{ status: AttendanceStatus; student: { id: number; fullName: string }; session: { class: { name: string } } }>) {
    const absentStudents = this.rankStudents(records, AttendanceStatus.absent).filter((s) => s.total >= 3);
    const lowClasses = this.attendanceRate(records, (record) => record.session.class.name).filter((item) => item.rate > 0 && item.rate < 70);
    return { highAbsenceStudents: absentStudents, lowAttendanceClasses: lowClasses };
  }
}
