import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard global de autenticación JWT. Verifica el header "Authorization: Bearer <token>".
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
