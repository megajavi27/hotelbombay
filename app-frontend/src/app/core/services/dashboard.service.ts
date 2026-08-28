import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface DashboardStats {
  habitaciones: {
    total: number;
    porEstado: Record<string, number>;
    porTipo: { nombre: string; total: number }[];
  };
  reservas: {
    total: number;
    porEstado: Record<string, number>;
    porMes: { mes: string; total: number }[];
  };
  pagos: {
    totalIngresos: number;
    porEstado: Record<string, number>;
    porMes: { mes: string; total: number }[];
  };
  tiposHabitacionTop: { nombre: string; reservas: number }[];
  totales: {
    clientes: number;
    empleados: number;
    recomendacionesActivas: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getStats() {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }
}
