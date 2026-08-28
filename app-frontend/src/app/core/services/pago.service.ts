import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PagedResult } from '../utils/pagination.util';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pago`;

  getAll(page = 1, limit = 10, filters?: { busqueda?: string; estado?: string }) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.estado)   params = params.set('estado', filters.estado);
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

  pagarMiReserva(dto: { id_reserva: number; nombre_tarjeta: string; ultimos_4: string; cuotas: number; tipo_tarjeta?: string }) {
    return this.http.post<any>(`${this.apiUrl}/mi-pago`, dto);
  }

  registrarTransferencia(id_reserva: number, referencia: string, comprobante: File) {
    const fd = new FormData();
    fd.append('id_reserva', String(id_reserva));
    fd.append('referencia', referencia);
    fd.append('comprobante', comprobante);
    return this.http.post<any>(`${this.apiUrl}/mi-transferencia`, fd);
  }

  validarPago(id: number) {
    return this.http.post<any>(`${this.apiUrl}/${id}/validar`, {});
  }

  rechazarPago(id: number, motivo: string) {
    return this.http.post<any>(`${this.apiUrl}/${id}/rechazar`, { motivo });
  }

  cobrarEfectivo(id: number) {
    return this.http.patch<any>(`${this.apiUrl}/${id}/cobrar-efectivo`, {});
  }

  cobrarEfectivoPorReserva(idReserva: number) {
    return this.http.patch<any>(`${this.apiUrl}/cobrar-reserva/${idReserva}`, {});
  }

  cobrarEfectivoReserva(id_reserva: number) {
    return this.http.patch<any>(`${this.apiUrl}/cobrar-reserva/${id_reserva}`, {});
  }
}
