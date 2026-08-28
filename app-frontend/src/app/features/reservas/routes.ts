import { Routes } from '@angular/router';
import { ListComponent } from './list/list';
import { FormComponent } from './form/form';

export const reservasRoutes: Routes = [
  { path: '', component: ListComponent },
  { path: 'nuevo', component: FormComponent },
  { path: 'editar/:id', component: FormComponent }
];
