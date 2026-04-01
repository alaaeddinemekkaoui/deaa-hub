import { UserRole } from '../../../common/types/role.type';
export declare class UpdateUserDto {
    fullName?: string;
    email?: string;
    password?: string;
    role?: UserRole;
}
