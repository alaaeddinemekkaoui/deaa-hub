import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../modules/users/users.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(identifier: string, password: string): Promise<{
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: number;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }>;
}
