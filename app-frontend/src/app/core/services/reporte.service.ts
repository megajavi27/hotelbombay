import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reporte`;

  private download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  ventas(desde?: string, hasta?: string) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http
      .get(`${this.apiUrl}/ventas`, { params, responseType: 'blob' })
      .pipe(tap(blob => this.download(blob, `reporte-ingresos${desde ? '-' + desde : ''}.pdf`)));
  }

  efectivo(desde?: string, hasta?: string) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http
      .get(`${this.apiUrl}/efectivo`, { params, responseType: 'blob' })
      .pipe(tap(blob => this.download(blob, `reporte-efectivo${desde ? '-' + desde : ''}.pdf`)));
  }

  ocupacion() {
    return this.http
      .get(`${this.apiUrl}/ocupacion`, { responseType: 'blob' })
      .pipe(tap(blob => this.download(blob, `reporte-ocupacion-${new Date().toISOString().slice(0,10)}.pdf`)));
  }

  reservas(desde?: string, hasta?: string, estado?: string) {
    let params = new HttpParams();
    if (desde)  params = params.set('desde', desde);
    if (hasta)  params = params.set('hasta', hasta);
    if (estado) params = params.set('estado', estado);
    return this.http
      .get(`${this.apiUrl}/reservas`, { params, responseType: 'blob' })
      .pipe(tap(blob => this.download(blob, `reporte-reservas${desde ? '-' + desde : ''}.pdf`)));
  }

  clientes() {
    return this.http
      .get(`${this.apiUrl}/clientes`, { responseType: 'blob' })
      .pipe(tap(blob => this.download(blob, `reporte-clientes-${new Date().toISOString().slice(0,10)}.pdf`)));
  }
}
