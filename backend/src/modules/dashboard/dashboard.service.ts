import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache';

type DashboardOverview = {
  stats: {
    totalStudents: number;
    teachersCount: number;
    departmentsCount: number;
    filieresCount: number;
    classesCount: number;
    dossiersCount: number;
  };
  studentsPerFiliere: Array<{
    filiereId: number;
    filiere: string;
    total: number;
  }>;
  studentsPerCycle: Array<{
    cycle: string;
    total: number;
  }>;
  laureatesPerYear: Array<{
    year: number;
    total: number;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    metadata: unknown;
    timestamp: Date;
    user: {
      id: number;
      fullName: string;
      role: string;
    };
  }>;
};

@Injectable()
export class DashboardService {
  private readonly overviewCache = new TtlCache<DashboardOverview>({
    key: 'dashboard:overview',
    ttlMs: 30 * 1000,
    staleTtlMs: 2 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    return this.overviewCache.getOrLoad(async () => {
      const [
        totalStudents,
        studentsPerFiliere,
        studentsPerCycle,
        teachersCount,
        departmentsCount,
        filieresCount,
        classesCount,
        dossiersCount,
        laureatesPerYear,
        recentActivity,
      ] = await Promise.all([
        this.prisma.student.count(),
        this.prisma.filiere.findMany({
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
        }),
        this.prisma.student.groupBy({
          by: ['cycle'],
          _count: { _all: true },
          orderBy: { cycle: 'asc' },
        }),
        this.prisma.teacher.count(),
        this.prisma.department.count(),
        this.prisma.filiere.count(),
        this.prisma.academicClass.count(),
        this.prisma.document.count(),
        this.prisma.laureate.groupBy({
          by: ['graduationYear'],
          _count: { _all: true },
          orderBy: { graduationYear: 'asc' },
        }),
        this.prisma.activityLog.findMany({
          include: {
            user: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        }),
      ]);

      return {
        stats: {
          totalStudents,
          teachersCount,
          departmentsCount,
          filieresCount,
          classesCount,
          dossiersCount,
        },
        studentsPerFiliere: studentsPerFiliere.map((item) => ({
          filiereId: item.id,
          filiere: item.name,
          total: item._count.students,
        })),
        studentsPerCycle: studentsPerCycle.map((item) => ({
          cycle: item.cycle,
          total: item._count._all,
        })),
        laureatesPerYear: laureatesPerYear.map((item) => ({
          year: item.graduationYear,
          total: item._count._all,
        })),
        recentActivity,
      };
    });
  }
}
