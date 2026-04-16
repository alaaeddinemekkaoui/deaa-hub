import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../types/role.type';

/**
 * Returns the department IDs that should be used to scope data queries.
 * Returns undefined for admins (no restriction) and for users with no departments.
 * Returns the array for users with specific department assignments.
 */
export function deptScope(user: JwtPayload): number[] | undefined {
  if (user.role !== UserRole.USER) return undefined;
  return user.departmentIds.length > 0 ? user.departmentIds : [];
}
