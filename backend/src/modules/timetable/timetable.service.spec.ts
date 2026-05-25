import { TimetableService } from './timetable.service';

describe('TimetableService group targeting', () => {
  let service: TimetableService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      elementModule: { findUnique: jest.fn() },
      academicClass: { findUnique: jest.fn() },
      teacher: { findUnique: jest.fn() },
      room: { findUnique: jest.fn() },
      classGroup: { findMany: jest.fn() },
      timetableSession: {
        create: jest.fn(),
      },
      roomReservation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new TimetableService(prisma);
  });

  it('creates one timetable session assigned to selected groups', async () => {
    prisma.elementModule.findUnique.mockResolvedValue({ id: 8 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 3 });
    prisma.classGroup.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    prisma.timetableSession.create.mockResolvedValue({
      id: 20,
      roomId: null,
      weekStart: null,
      groupAssignments: [],
    });

    await service.create({
      elementId: 8,
      classId: 3,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '10:00',
      groupIds: [11, 12],
    });

    expect(prisma.timetableSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groupAssignments: {
            create: [{ groupId: 11 }, { groupId: 12 }],
          },
        }),
      }),
    );
  });

  it('allows parallel sessions for different groups of the same class', () => {
    const conflicts = (service as any).detectConflicts([
      sessionForGroup(1, 3, 11),
      sessionForGroup(2, 3, 12),
    ]);

    expect(conflicts).toEqual([]);
  });

  it('treats whole-class sessions as conflicting with group sessions', () => {
    const conflicts = (service as any).detectConflicts([
      sessionForWholeClass(1, 3),
      sessionForGroup(2, 3, 12),
    ]);

    expect(conflicts).toContainEqual({
      sessionIds: [1, 2],
      reason: 'Même classe/groupe en même temps',
    });
  });
});

function sessionForGroup(id: number, classId: number, groupId: number) {
  return {
    id,
    classId,
    teacherId: null,
    roomId: null,
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '10:00',
    groupAssignments: [{ groupId }],
  };
}

function sessionForWholeClass(id: number, classId: number) {
  return {
    ...sessionForGroup(id, classId, 0),
    groupAssignments: [],
  };
}
