import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de módulo: bloquea si el perfil del usuario no tiene acceso.
 * Usar con data: { modulo: 'reservas' } en la ruta.
 */
export const perfilGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const modulo: string = route.data['modulo'];

  if (!modulo || auth.puedeAcceder(modulo)) return true;

  // Redirigir a la home según tipo de usuario
  const tipo = auth.usuario()?.tipo;
  router.navigate([tipo === 'cliente' ? '/mi-inicio' : '/dashboard']);
  return false;
};
