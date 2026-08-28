import { Routes } from '@angular/router';

export const recomendacionesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/list').then(m => m.RecomendacionesListComponent),
  },
  {
    path: 'nueva',
    loadComponent: () => import('./form/form').then(m => m.RecomendacionFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./form/form').then(m => m.RecomendacionFormComponent),
  },
];
