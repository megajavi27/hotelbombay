import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PagedResult } from '../utils/pagination.util';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reserva`;

  getAll(page = 1, limit = 10, filters?: { busqueda?: string; fecha_inicio?: string; fecha_fin?: string; estado?: string }) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.busqueda)     params = params.set('busqueda', filters.busqueda);
    if (filters?.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin)    params = params.set('fecha_fin', filters.fecha_fin);
    if (filters?.estado)       params = params.set('estado', filters.estado);
    return this.http.get<PagedResult<any>>(this.apiUrl, { params });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(dto: any) {
    return this.http.post<any>(this.apiUrl, dto);
  }

  update(id: number, dto: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getMisReservas(page = 1, limit = 10, filters?: { estado?: string; fecha_inicio?: string; fecha_fin?: string }) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.estado)       params = params.set('estado', filters.estado);
    if (filters?.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin)    params = params.set('fecha_fin', filters.fecha_fin);
    return this.http.get<PagedResult<any>>(`${this.apiUrl}/mis-reservas`, { params });
  }

  checkIn(id: number) {
    return this.http.patch<any>(`${this.apiUrl}/${id}/checkin`, {});
  }

  checkOut(id: number) {
    return this.http.patch<any>(`${this.apiUrl}/${id}/checkout`, {});
  }

  cancelarMiReserva(id: number) {
    return this.http.patch<{ eliminada: boolean; mensaje: string }>(`${this.apiUrl}/mis-reservas/${id}/cancelar`, {});
  }
}
