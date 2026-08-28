import { Routes } from '@angular/router';

export const reportesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./reportes').then(m => m.ReportesComponent),
  },
];
