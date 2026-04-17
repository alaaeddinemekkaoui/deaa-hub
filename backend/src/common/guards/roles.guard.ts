import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, DEPT_SCOPED_ROLES } from '../types/role.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { role?: UserRole };
    }>();
    const user = request.user;

    // Admins bypass all role restrictions
    if (user?.role === UserRole.ADMIN) {
      return true;
    }

    if (!user?.role) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    // Direct match
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // If the required roles include any dept-scoped role (e.g. USER) and the
    // user's role is also dept-scoped (TEACHER / STUDENT / INSPECTOR), allow it.
    const requiresDeptScoped = requiredRoles.some((r) => DEPT_SCOPED_ROLES.has(r));
    if (requiresDeptScoped && DEPT_SCOPED_ROLES.has(user.role)) {
      return true;
    }

    throw new ForbiddenException('Insufficient role permissions');
  }
}
