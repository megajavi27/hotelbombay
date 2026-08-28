import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor que:
 * 1. Agrega el header "Authorization: Bearer <token>" a las peticiones cuando hay sesión activa.
 * 2. Captura respuestas 401 (token inválido o expirado) y fuerza el logout.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error) => {
      const isAuthUrl = req.url.includes('/auth/login');
      if (error.status === 401 && !isAuthUrl) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
