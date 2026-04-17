import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { isDeptScoped, UserRole } from '../types/role.type';

/**
 * Returns the department IDs that should be used to scope data queries.
 * Returns undefined for admins/staff/viewer (no restriction).
 * Returns the array for dept-scoped roles (user/teacher/student/inspector).
 */
export function deptScope(user: JwtPayload): number[] | undefined {
  if (!isDeptScoped(user.role as UserRole)) return undefined;
  return user.departmentIds.length > 0 ? user.departmentIds : [];
}
