import { Routes } from '@angular/router';

export const misReservasRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/list').then(m => m.MisReservasListComponent),
  },
  {
    path: 'nueva',
    loadComponent: () => import('./form/form').then(m => m.NuevaReservaFormComponent),
  },
  {
    path: ':id/pagar',
    loadComponent: () => import('./pago/pago').then(m => m.PagoReservaComponent),
  },
];
