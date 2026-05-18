import { NotFoundException } from '@nestjs/common';
import { ElementModulesService } from './element-modules.service';

describe('ElementModulesService', () => {
  let service: ElementModulesService;
  let prisma: any;
  let modulesService: any;

  beforeEach(() => {
    prisma = {
      module: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 1 })
          .mockResolvedValueOnce({ filiere: { departmentId: 10 } }),
      },
      moduleClass: {
        findMany: jest.fn().mockResolvedValue([{ classId: 2 }, { classId: 3 }]),
      },
      elementModule: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 100, name: 'Algo', cours: null }),
        findUnique: jest.fn().mockResolvedValue({ id: 100, name: 'Algo' }),
      },
    };
    modulesService = {
      ensureCoursAndCoursClass: jest.fn().mockResolvedValue(undefined),
    };

    service = new ElementModulesService(prisma, modulesService);
  });

  it('create should create an element and provision cours assignments for module classes', async () => {
    const result = await service.create({
      name: 'Algo',
      moduleId: 1,
      classId: 2,
      type: 'CM',
      volumeHoraire: 20,
    });

    expect(prisma.elementModule.create).toHaveBeenCalledWith({
      data: {
        name: 'Algo',
        moduleId: 1,
        volumeHoraire: 20,
        sessionDurationMinutes: null,
        type: 'CM',
        ponderation: 1,
        coefficient: 1,
        classId: null,
      },
      select: { id: true, name: true, cours: { select: { id: true } } },
    });
    expect(modulesService.ensureCoursAndCoursClass).toHaveBeenCalledTimes(2);
    expect(modulesService.ensureCoursAndCoursClass).toHaveBeenCalledWith(
      { id: 100, name: 'Algo', cours: null },
      2,
    );
    expect(result).toEqual({ id: 100, name: 'Algo' });
  });

  it('create should throw when module does not exist', async () => {
    prisma.module.findUnique.mockReset();
    prisma.module.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'Algo',
        moduleId: 999,
        type: 'CM',
        volumeHoraire: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create should skip cours assignment when the module has no classes', async () => {
    prisma.moduleClass.findMany.mockResolvedValue([]);

    await service.create({
      name: 'Cours Sans Classe',
      moduleId: 1,
      type: 'CM',
      volumeHoraire: 10,
    });

    expect(modulesService.ensureCoursAndCoursClass).not.toHaveBeenCalled();
  });
});
