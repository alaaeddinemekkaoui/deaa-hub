import { UserRole } from '../../../common/types/role.type';
export declare class CreateUserDto {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
}
