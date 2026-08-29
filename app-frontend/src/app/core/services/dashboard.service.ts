import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

/** Un punto de una serie por categoría: nombre y valor. */
export interface PuntoCategoria {
  etiqueta: string;
  total: number;
}

/** Un punto de una serie mensual. `mes` va de 1 a 12. */
export interface PuntoMes {
  mes: number;
  total: number;
}

export interface ClienteTop {
  documento: string;
  nombre: string;
  total: number;
}

export interface AnaliticaDashboard {
  filtros: {
    anios: number[];
    anioSeleccionado: number | null;
    mesSeleccionado: number | null;
  };
  kpis: {
    reservasConfirmadas: number;
    ingresos: number;
    huespedes: number;
    mediaReservasMes: number;
    estanciaMedia: number;
    indiceOcupacion: number;
    desde: string;
    hasta: string;
  };
  general: {
    reservasPorMes: PuntoMes[];
    ingresosPorMes: PuntoMes[];
    reservasPorTipo: PuntoCategoria[];
    ingresoPorTipo: PuntoCategoria[];
    ingresosPorMetodo: PuntoCategoria[];
    reservasPorEstado: PuntoCategoria[];
  };
  clientes: {
    reservasPorNacionalidad: PuntoCategoria[];
    topClientes: ClienteTop[];
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  /**
   * Trae los datos de las dos pestañas ya filtrados por el servidor.
   * `anio` en null significa todo el histórico; `mes` solo se aplica con año.
   */
  getAnalitica(anio: number | null, mes: number | null) {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio);
    if (anio && mes) params = params.set('mes', mes);
    return this.http.get<AnaliticaDashboard>(`${this.apiUrl}/analitica`, { params });
  }
}
