import { ElementModulesService } from './element-modules.service';
import { NotFoundException } from '@nestjs/common';

describe('ElementModulesService', () => {
  let service: ElementModulesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      module: {
        findUnique: jest.fn(),
      },
      academicClass: {
        findUnique: jest.fn(),
      },
      elementModule: {
        create: jest.fn(),
      },
      cours: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      coursClass: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    service = new ElementModulesService(prisma);
  });

  it('create should link an existing unlinked cours and create class assignment when needed', async () => {
    prisma.module.findUnique.mockResolvedValue({ id: 1 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 2 });
    prisma.elementModule.create.mockResolvedValue({ id: 100, name: 'Algo' });
    prisma.cours.findFirst.mockResolvedValue({
      id: 200,
      elementModuleId: null,
    });
    prisma.cours.update.mockResolvedValue({ id: 200, elementModuleId: 100 });
    prisma.coursClass.findFirst.mockResolvedValue(null);
    prisma.coursClass.create.mockResolvedValue({ id: 300 });

    const result = await service.create({
      name: 'Algo',
      moduleId: 1,
      classId: 2,
      type: 'CM',
      volumeHoraire: 20,
    });

    expect(prisma.cours.update).toHaveBeenCalledWith({
      where: { id: 200 },
      data: { elementModuleId: 100 },
    });
    expect(prisma.coursClass.create).toHaveBeenCalledWith({
      data: { coursId: 200, classId: 2, teacherId: null },
    });
    expect(prisma.cours.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 100, name: 'Algo' });
  });

  it('create should create a new cours when no cours with same name exists', async () => {
    prisma.module.findUnique.mockResolvedValue({ id: 1 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 2 });
    prisma.elementModule.create.mockResolvedValue({
      id: 101,
      name: 'Hydrologie',
    });
    prisma.cours.findFirst.mockResolvedValue(null);
    prisma.cours.create.mockResolvedValue({ id: 201, name: 'Hydrologie' });
    prisma.coursClass.create.mockResolvedValue({ id: 301 });

    await service.create({
      name: 'Hydrologie',
      moduleId: 1,
      classId: 2,
      type: 'CM',
      volumeHoraire: 30,
    });

    expect(prisma.cours.create).toHaveBeenCalledWith({
      data: { name: 'Hydrologie', elementModuleId: 101 },
    });
    expect(prisma.coursClass.create).toHaveBeenCalledWith({
      data: { coursId: 201, classId: 2 },
    });
  });

  it('create should not relink or duplicate when existing cours is already linked and assignment exists', async () => {
    prisma.module.findUnique.mockResolvedValue({ id: 1 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 2 });
    prisma.elementModule.create.mockResolvedValue({
      id: 102,
      name: 'Biochimie',
    });
    prisma.cours.findFirst.mockResolvedValue({ id: 202, elementModuleId: 999 });
    prisma.coursClass.findFirst.mockResolvedValue({ id: 302 });

    await service.create({
      name: 'Biochimie',
      moduleId: 1,
      classId: 2,
      type: 'CM',
      volumeHoraire: 25,
    });

    expect(prisma.cours.update).not.toHaveBeenCalled();
    expect(prisma.coursClass.create).not.toHaveBeenCalled();
    expect(prisma.cours.create).not.toHaveBeenCalled();
  });

  it('create should throw when module does not exist', async () => {
    prisma.module.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'Algo',
        moduleId: 999,
        classId: 2,
        type: 'CM',
        volumeHoraire: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create should throw when class does not exist and classId is provided', async () => {
    prisma.module.findUnique.mockResolvedValue({ id: 1 });
    prisma.academicClass.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'Algo',
        moduleId: 1,
        classId: 999,
        type: 'CM',
        volumeHoraire: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create should skip class assignment when classId is not provided', async () => {
    prisma.module.findUnique.mockResolvedValue({ id: 1 });
    prisma.elementModule.create.mockResolvedValue({
      id: 111,
      name: 'Cours Sans Classe',
    });
    prisma.cours.findFirst.mockResolvedValue({
      id: 211,
      elementModuleId: null,
    });
    prisma.cours.update.mockResolvedValue({ id: 211, elementModuleId: 111 });

    await service.create({
      name: 'Cours Sans Classe',
      moduleId: 1,
      type: 'CM',
      volumeHoraire: 10,
    });

    expect(prisma.coursClass.findFirst).not.toHaveBeenCalled();
    expect(prisma.coursClass.create).not.toHaveBeenCalled();
  });
});
