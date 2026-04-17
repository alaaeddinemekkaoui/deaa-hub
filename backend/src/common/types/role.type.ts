export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  VIEWER = 'viewer',
  USER = 'user',
  TEACHER = 'teacher',
  STUDENT = 'student',
  INSPECTOR = 'inspector',
}

/**
 * Roles that are scoped to their own department(s) and have limited write access.
 * Includes UserRole.USER for backwards compatibility.
 */
export const DEPT_SCOPED_ROLES = new Set<UserRole>([
  UserRole.USER,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.INSPECTOR,
]);

/** Returns true if this role is department-scoped (not a global admin/staff/viewer). */
export function isDeptScoped(role: UserRole): boolean {
  return DEPT_SCOPED_ROLES.has(role);
}
