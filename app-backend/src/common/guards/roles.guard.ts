import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TipoUsuario } from '../enums/rol.enum';

/**
 * Guard que valida que el tipo del usuario autenticado (empleado | cliente)
 * esté dentro de los tipos permitidos definidos con @Roles(...).
 * Debe usarse después de JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTipos = this.reflector.getAllAndOverride<TipoUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTipos || requiredTipos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredTipos.includes(user?.tipo);
  }
}
