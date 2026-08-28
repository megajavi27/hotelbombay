import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { perfilGuard } from '@guards/perfil.guard';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/public/landing/landing').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
  { path: 'registro', loadComponent: () => import('./features/auth/registro/registro').then(m => m.RegistroComponent) },
  { path: 'olvide-password', loadComponent: () => import('./features/auth/olvide-password/olvide-password').then(m => m.OlvidePasswordComponent) },
  { path: 'restablecer-password', loadComponent: () => import('./features/auth/restablecer-password/restablecer-password').then(m => m.RestablecerPasswordComponent) },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [perfilGuard], data: { modulo: 'dashboard' }
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./features/usuarios/routes').then(m => m.usuariosRoutes),
        canActivate: [perfilGuard], data: { modulo: 'usuarios' }
      },
      {
        path: 'clientes',
        loadChildren: () => import('./features/clientes/routes').then(m => m.clientesRoutes),
        canActivate: [perfilGuard], data: { modulo: 'clientes' }
      },
      {
        path: 'empleados',
        loadChildren: () => import('./features/empleados/routes').then(m => m.empleadosRoutes),
        canActivate: [perfilGuard], data: { modulo: 'empleados' }
      },
      {
        path: 'tipos-habitacion',
        loadChildren: () => import('./features/tipos-habitacion/routes').then(m => m.tiposHabitacionRoutes),
        canActivate: [perfilGuard], data: { modulo: 'tipos-habitacion' }
      },
      {
        path: 'habitaciones',
        loadChildren: () => import('./features/habitaciones/routes').then(m => m.habitacionesRoutes),
        canActivate: [perfilGuard], data: { modulo: 'habitaciones' }
      },
      {
        path: 'reservas',
        loadChildren: () => import('./features/reservas/routes').then(m => m.reservasRoutes),
        canActivate: [perfilGuard], data: { modulo: 'reservas' }
      },
      {
        path: 'pagos',
        loadChildren: () => import('./features/pagos/routes').then(m => m.pagosRoutes),
        canActivate: [perfilGuard], data: { modulo: 'pagos' }
      },
      {
        path: 'reportes',
        loadChildren: () => import('./features/reportes/routes').then(m => m.reportesRoutes),
        canActivate: [perfilGuard], data: { modulo: 'reportes' }
      },
      {
        path: 'recomendaciones',
        loadChildren: () => import('./features/recomendaciones/routes').then(m => m.recomendacionesRoutes),
        canActivate: [perfilGuard], data: { modulo: 'recomendaciones' }
      },
      {
        path: 'mi-inicio',
        loadComponent: () => import('./features/portal-cliente/mi-inicio/mi-inicio').then(m => m.MiInicioComponent),
        canActivate: [perfilGuard], data: { modulo: 'mi-inicio' }
      },
      {
        path: 'mis-reservas',
        loadChildren: () => import('./features/portal-cliente/mis-reservas/routes').then(m => m.misReservasRoutes),
        canActivate: [perfilGuard], data: { modulo: 'mis-reservas' }
      },
      {
        path: 'mi-perfil',
        loadComponent: () => import('./features/portal-cliente/mi-perfil/mi-perfil').then(m => m.MiPerfilComponent),
        canActivate: [perfilGuard], data: { modulo: 'mi-perfil' }
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
