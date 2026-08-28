import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware global que imprime en consola cada petición entrante:
 * IP del cliente, método HTTP, URL/endpoint solicitado y, si el método
 * puede llevar body (POST, PUT, PATCH, DELETE), también el contenido del body.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  private readonly metodosConBody = ['POST', 'PUT', 'PATCH', 'DELETE'];

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'desconocida';
    const { method, originalUrl } = req;

    let mensaje = `IP: ${ip} | Método: ${method} | Endpoint: ${originalUrl}`;

    if (this.metodosConBody.includes(method) && req.body && Object.keys(req.body).length > 0) {
      const body = { ...req.body };
      if (body.password) body.password = '******';
      mensaje += ` | Body: ${JSON.stringify(body)}`;
    }

    this.logger.log(mensaje);
    next();
  }
}
