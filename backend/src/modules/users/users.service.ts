import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
  departments: {
    select: {
      department: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

type UserWithDepts = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  createdAt: Date;
  departments: { department: { id: number; name: string } }[];
};

type MappedUser = Omit<UserWithDepts, 'departments'> & {
  departments: { id: number; name: string }[];
};

function mapDepartments(user: UserWithDepts): MappedUser {
  const { departments, ...rest } = user;
  return {
    ...rest,
    departments: departments.map((ud) => ud.department),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(mapDepartments);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) return null;
    return mapDepartments(user);
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByLoginIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { fullName: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });
  }

  async getUserDepartments(userId: number) {
    const records = await this.prisma.userDepartment.findMany({
      where: { userId },
      select: { department: { select: { id: true, name: true } } },
    });
    return records.map((r) => r.department);
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
        passwordHash,
        departments: dto.departmentIds?.length
          ? {
              create: dto.departmentIds.map((departmentId) => ({ departmentId })),
            }
          : undefined,
      },
      select: USER_SELECT,
    });
    return mapDepartments(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    const { departmentIds, password, ...rest } = dto;

    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (departmentIds !== undefined) {
        await tx.userDepartment.deleteMany({ where: { userId: id } });
        if (departmentIds.length > 0) {
          await tx.userDepartment.createMany({
            data: departmentIds.map((departmentId) => ({ userId: id, departmentId })),
          });
        }
      }

      return tx.user.update({
        where: { id },
        data,
        select: USER_SELECT,
      });
    });

    return mapDepartments(user);
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}
