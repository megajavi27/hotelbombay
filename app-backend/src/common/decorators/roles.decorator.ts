import { SetMetadata } from '@nestjs/common';
import { TipoUsuario } from '../enums/rol.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorador para restringir el acceso a un endpoint según el tipo del usuario autenticado.
 * Uso: @Roles('empleado') | @Roles('empleado', 'cliente')
 */
export const Roles = (...tipos: TipoUsuario[]) => SetMetadata(ROLES_KEY, tipos);
