import { Injectable } from '@nestjs/common';
import { AttendanceStatus, Prisma, Sex } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';

type AnalyticsQuery = Record<string, string | undefined>;

@Injectable()
export class AnalyticsService {
  private readonly overviewCache = new KeyedTtlCache<unknown>({
    prefix: 'analytics:overview',
    ttlMs: 2 * 60 * 1000,
    staleTtlMs: 10 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async overview(query: AnalyticsQuery) {
    const cacheKey = JSON.stringify(
      Object.fromEntries(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== '')
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    );

    return this.overviewCache.getOrLoad(cacheKey, () => this.loadOverview(query));
  }

  private async loadOverview(query: AnalyticsQuery) {
    const studentWhere = this.studentWhere(query);
    const attendanceWhere = this.attendanceWhere(query);

    const [students, records, teachers, classes, coursAssignments] = await Promise.all([
      this.prisma.student.findMany({
        where: studentWhere,
        select: {
          id: true,
          fullName: true,
          sex: true,
          dateNaissance: true,
          filiereId: true,
          classId: true,
          filiere: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
          academicClass: { select: { id: true, name: true, filiereId: true } },
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
              class: {
                select: {
                  id: true,
                  name: true,
                  filiere: { select: { id: true, name: true } },
                },
              },
              element: { select: { id: true, name: true, cours: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      this.prisma.teacher.findMany({
        where: this.teacherWhere(query),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          sex: true,
          department: { select: { id: true, name: true } },
          filiere: { select: { id: true, name: true } },
          taughtClasses: {
            select: { class: { select: { id: true, name: true, filiereId: true } } },
          },
        },
      }),
      this.prisma.academicClass.findMany({
        where: this.classWhere(query),
        select: {
          id: true,
          name: true,
          year: true,
          filiere: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
          teachers: { select: { teacherId: true } },
        },
      }),
      this.prisma.coursClass.findMany({
        where: this.coursClassWhere(query),
        select: {
          coursId: true,
          cours: { select: { id: true, name: true, type: true } },
          class: {
            select: {
              id: true,
              name: true,
              filiere: {
                select: {
                  id: true,
                  name: true,
                  department: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const byFiliere = new Map<string, number>();
    const byClass = new Map<string, number>();
    const byDepartment = new Map<string, number>();
    const byBirthYear = new Map<string, number>();
    const byAge = new Map<string, number>();
    const gender = new Map<string, number>([
      ['male', 0],
      ['female', 0],
    ]);

    for (const student of students) {
      byFiliere.set(student.filiere?.name ?? 'Non assignée', (byFiliere.get(student.filiere?.name ?? 'Non assignée') ?? 0) + 1);
      byClass.set(student.academicClass?.name ?? 'Non assignée', (byClass.get(student.academicClass?.name ?? 'Non assignée') ?? 0) + 1);
      byDepartment.set(student.filiere?.department?.name ?? 'Non assigné', (byDepartment.get(student.filiere?.department?.name ?? 'Non assigné') ?? 0) + 1);
      const birthYear = student.dateNaissance.getFullYear();
      byBirthYear.set(String(birthYear), (byBirthYear.get(String(birthYear)) ?? 0) + 1);
      const age = this.ageFromDate(student.dateNaissance);
      byAge.set(String(age), (byAge.get(String(age)) ?? 0) + 1);
      gender.set(student.sex, (gender.get(student.sex) ?? 0) + 1);
    }

    const teachersByDepartment = new Map<string, number>();
    const teachersByFiliere = new Map<string, number>();
    const teacherGender = new Map<string, number>([
      ['male', 0],
      ['female', 0],
    ]);
    const classesByFiliere = new Map<string, number>();
    const classesByDepartment = new Map<string, number>();
    const classTeacherCounts = classes.map((academicClass) => ({
      classId: academicClass.id,
      name: academicClass.name,
      filiere: academicClass.filiere?.name ?? 'Non assignée',
      department: academicClass.filiere?.department?.name ?? 'Non assigné',
      teachers: academicClass.teachers.length,
    }));
    for (const academicClass of classes) {
      const filiereName = academicClass.filiere?.name ?? 'Non assignée';
      const departmentName = academicClass.filiere?.department?.name ?? 'Non assigné';
      classesByFiliere.set(filiereName, (classesByFiliere.get(filiereName) ?? 0) + 1);
      classesByDepartment.set(departmentName, (classesByDepartment.get(departmentName) ?? 0) + 1);
    }
    const teacherClassLoad = teachers
      .map((teacher) => {
        teachersByDepartment.set(teacher.department.name, (teachersByDepartment.get(teacher.department.name) ?? 0) + 1);
        teachersByFiliere.set(teacher.filiere?.name ?? 'Non assignée', (teachersByFiliere.get(teacher.filiere?.name ?? 'Non assignée') ?? 0) + 1);
        teacherGender.set(teacher.sex, (teacherGender.get(teacher.sex) ?? 0) + 1);
        return {
          teacherId: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          department: teacher.department.name,
          filiere: teacher.filiere?.name ?? 'Non assignée',
          classes: teacher.taughtClasses.length,
          classNames: teacher.taughtClasses.map((entry) => entry.class.name).join(', '),
        };
      })
      .sort((a, b) => b.classes - a.classes);
    const coursByFiliere = this.groupCoursByFiliere(coursAssignments);

    const present = records.filter((r) => r.status === AttendanceStatus.present).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.absent).length;
    const pending = records.filter((r) => r.status === AttendanceStatus.pending).length;
    const decided = present + absent;

    return {
      metrics: {
        totalStudents: students.length,
        teachersCount: teachers.length,
        classesCount: classes.length,
        filieresCount: new Set(students.map((s) => s.filiereId).filter(Boolean)).size,
        departmentsCount: new Set(students.map((s) => s.filiere?.department?.id).filter(Boolean)).size,
        attendanceRate: decided ? Math.round((present / decided) * 1000) / 10 : 0,
        present,
        absent,
        pending,
      },
      studentsPerDepartment: this.mapToChart(byDepartment, 'department'),
      studentsPerFiliere: this.mapToChart(byFiliere, 'filiere'),
      studentsPerClass: this.mapToChart(byClass, 'className'),
      studentsByBirthYear: this.mapToChart(byBirthYear, 'birthYear').sort((a, b) => String(a.birthYear).localeCompare(String(b.birthYear))),
      studentsByAge: this.mapToChart(byAge, 'age').sort((a, b) => Number(a.age) - Number(b.age)),
      genderDistribution: this.mapToChart(gender, 'gender'),
      teacherGenderDistribution: this.mapToChart(teacherGender, 'gender'),
      teachersPerDepartment: this.mapToChart(teachersByDepartment, 'department'),
      teachersPerFiliere: this.mapToChart(teachersByFiliere, 'filiere'),
      teacherClassLoad,
      classTeacherCounts: classTeacherCounts.sort((a, b) => b.teachers - a.teachers),
      classesPerFiliere: this.mapToChart(classesByFiliere, 'filiere'),
      classesPerDepartment: this.mapToChart(classesByDepartment, 'department'),
      coursByFiliere,
      attendanceByStatus: [
        { status: 'present', total: present },
        { status: 'absent', total: absent },
        { status: 'pending', total: pending },
      ],
      attendanceByClass: this.attendanceRate(records, (record) => record.session.class.name),
      attendanceByCourse: this.attendanceRate(records, (record) => {
        const courseName = record.course?.name ?? record.session.element?.cours?.name ?? record.session.element?.name ?? 'Sans cours';
        const className = record.session.class.name;
        const filiereName = record.session.class.filiere?.name ?? 'Non assignée';
        return `${filiereName} / ${className} / ${courseName}`;
      }),
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
    if (query.birthYear) {
      const year = Number(query.birthYear);
      if (Number.isInteger(year) && year > 1900) {
        where.dateNaissance = {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        };
      }
    }
    return where;
  }

  private teacherWhere(query: AnalyticsQuery): Prisma.TeacherWhereInput {
    const where: Prisma.TeacherWhereInput = {};
    if (query.departmentId) where.departmentId = Number(query.departmentId);
    if (query.filiereId) where.filiereId = Number(query.filiereId);
    if (query.classId) where.taughtClasses = { some: { classId: Number(query.classId) } };
    if (query.gender === Sex.male || query.gender === Sex.female) where.sex = query.gender;
    return where;
  }

  private classWhere(query: AnalyticsQuery): Prisma.AcademicClassWhereInput {
    const where: Prisma.AcademicClassWhereInput = {};
    if (query.departmentId) where.filiere = { departmentId: Number(query.departmentId) };
    if (query.filiereId) where.filiereId = Number(query.filiereId);
    if (query.classId) where.id = Number(query.classId);
    return where;
  }

  private coursClassWhere(query: AnalyticsQuery): Prisma.CoursClassWhereInput {
    const where: Prisma.CoursClassWhereInput = {};
    if (query.courseId) where.coursId = Number(query.courseId);
    if (query.classId) where.classId = Number(query.classId);
    const classFilters = this.classWhere(query);
    if (Object.keys(classFilters).length > 0) where.class = classFilters;
    return where;
  }

  private attendanceWhere(query: AnalyticsQuery): Prisma.AttendanceRecordWhereInput {
    const where: Prisma.AttendanceRecordWhereInput = {};
    const andFilters: Prisma.AttendanceRecordWhereInput[] = [];
    if (query.status && ['present', 'absent', 'pending'].includes(query.status)) {
      where.status = query.status as AttendanceStatus;
    }
    if (query.courseId) {
      const courseId = Number(query.courseId);
      andFilters.push({
        OR: [
          { courseId },
          { session: { element: { cours: { id: courseId } } } },
        ],
      });
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(`${query.endDate}T23:59:59.999`);
    }
    const studentFilters = this.studentWhere(query);
    if (Object.keys(studentFilters).length > 0) where.student = studentFilters;
    if (query.departmentId || query.filiereId || query.classId) {
      andFilters.push({ session: { class: this.classWhere(query) } });
    }
    if (andFilters.length > 0) where.AND = andFilters;
    return where;
  }

  private groupCoursByFiliere(
    assignments: Array<{
      coursId: number;
      cours: { id: number; name: string; type: string };
      class: {
        id: number;
        name: string;
        filiere: { id: number; name: string; department: { id: number; name: string } } | null;
      };
    }>,
  ) {
    const grouped = new Map<
      string,
      {
        filiere: string;
        department: string;
        totalCourses: number;
        totalClasses: number;
        courses: string;
      }
    >();
    const courseKeys = new Map<string, Set<number>>();
    const classKeys = new Map<string, Set<number>>();

    for (const assignment of assignments) {
      const filiere = assignment.class.filiere?.name ?? 'Non assignée';
      const department = assignment.class.filiere?.department?.name ?? 'Non assigné';
      const current =
        grouped.get(filiere) ??
        {
          filiere,
          department,
          totalCourses: 0,
          totalClasses: 0,
          courses: '',
        };
      grouped.set(filiere, current);

      const courses = courseKeys.get(filiere) ?? new Set<number>();
      courses.add(assignment.coursId);
      courseKeys.set(filiere, courses);

      const classes = classKeys.get(filiere) ?? new Set<number>();
      classes.add(assignment.class.id);
      classKeys.set(filiere, classes);
    }

    return Array.from(grouped.values())
      .map((item) => {
        const related = assignments
          .filter((assignment) => (assignment.class.filiere?.name ?? 'Non assignée') === item.filiere)
          .map((assignment) => `${assignment.cours.name} (${assignment.class.name})`);
        return {
          ...item,
          totalCourses: courseKeys.get(item.filiere)?.size ?? 0,
          totalClasses: classKeys.get(item.filiere)?.size ?? 0,
          courses: Array.from(new Set(related)).sort((a, b) => a.localeCompare(b)).join(', '),
        };
      })
      .sort((a, b) => b.totalCourses - a.totalCourses);
  }

  private mapToChart(map: Map<string, number>, key: string) {
    return Array.from(map.entries())
      .map(([name, total]) => ({ [key]: name, total }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  }

  private ageFromDate(date: Date) {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDelta = today.getMonth() - date.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
      age -= 1;
    }
    return age;
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
