import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: number;
        createdAt: Date;
    }[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__UserClient<{
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: number;
        createdAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateUserDto): Promise<{
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: number;
        createdAt: Date;
    }>;
    update(id: number, dto: UpdateUserDto): Promise<{
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: number;
        createdAt: Date;
    }>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__UserClient<{
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: number;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
