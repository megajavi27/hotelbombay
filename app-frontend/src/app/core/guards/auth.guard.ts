import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

/**
 * Guard que exige un token JWT presente y válido (verificado contra GET /auth/me).
 * Si no hay token o el backend lo rechaza, redirige a /login conservando la URL
 * a la que el usuario intentaba entrar (returnUrl), para poder retomarla después
 * de iniciar sesión (ej: continuar una reserva empezada desde la página pública).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  return authService.me().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};
