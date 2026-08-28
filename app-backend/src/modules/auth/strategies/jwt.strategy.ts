import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  email: string;
  tipo: 'empleado' | 'cliente';
  perfil?: string;
  id_empleado?: number;
  id_cliente?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado. Defínelo en las variables de entorno antes de arrancar la aplicación.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id_usuario:  payload.sub,
      email:       payload.email,
      tipo:        payload.tipo,
      perfil:      payload.perfil,
      id_empleado: payload.id_empleado,
      id_cliente:  payload.id_cliente,
    };
  }
}
