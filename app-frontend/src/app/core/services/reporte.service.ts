import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reporte`;

  /**
   * Guarda el PDF en el disco del usuario.
   *
   * Dos detalles que hacían fallar la descarga en silencio:
   *
   * 1. El enlace tiene que estar dentro del documento. Un <a> suelto en memoria
   *    funciona en algunos navegadores y en otros el click no hace nada.
   * 2. La URL del blob NO se puede revocar en la misma línea que el click. El
   *    navegador arranca la descarga de forma asíncrona; si la URL ya se
   *    invalidó cuando va a leerla, cancela la descarga sin mostrar ningún
   *    error. Por eso se revoca en el siguiente ciclo del event loop.
   */
  private guardar(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = filename;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();

    setTimeout(() => {
      enlace.remove();
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Traduce los errores de una petición con `responseType: 'blob'`.
   *
   * Cuando la respuesta se pide como blob, Angular también entrega el cuerpo de
   * los errores como Blob. Es decir que `err.error.message` queda en undefined y
   * el componente terminaba mostrando un mensaje genérico aunque el backend
   * hubiera explicado perfectamente qué pasó. Aquí se lee ese blob y se
   * reconstruye el error con la forma que el componente espera.
   */
  private traducirError(err: HttpErrorResponse): Observable<never> {
    if (!(err.error instanceof Blob)) {
      return throwError(() => err);
    }

    return from(err.error.text()).pipe(
      switchMap((texto) => {
        let mensaje = 'No se pudo generar el reporte.';
        try {
          mensaje = JSON.parse(texto)?.message ?? mensaje;
        } catch {
          // El cuerpo no era JSON: nos quedamos con el mensaje por defecto.
        }
        return throwError(() => ({ status: err.status, error: { message: mensaje } }));
      }),
    );
  }

  /** Descarga un PDF del backend y lo guarda con el nombre indicado. */
  private descargar(ruta: string, filename: string, params?: HttpParams): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/${ruta}`, { params, responseType: 'blob' })
      .pipe(
        tap((blob) => this.guardar(blob, filename)),
        catchError((err: HttpErrorResponse) => this.traducirError(err)),
      );
  }

  /** Construye los parámetros de fecha omitiendo los que vengan vacíos. */
  private rango(desde?: string, hasta?: string, estado?: string): HttpParams {
    let params = new HttpParams();
    if (desde)  params = params.set('desde', desde);
    if (hasta)  params = params.set('hasta', hasta);
    if (estado) params = params.set('estado', estado);
    return params;
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  ventas(desde?: string, hasta?: string) {
    return this.descargar(
      'ventas',
      `reporte-ingresos${desde ? '-' + desde : ''}.pdf`,
      this.rango(desde, hasta),
    );
  }

  efectivo(desde?: string, hasta?: string) {
    return this.descargar(
      'efectivo',
      `reporte-efectivo${desde ? '-' + desde : ''}.pdf`,
      this.rango(desde, hasta),
    );
  }

  ocupacion() {
    return this.descargar('ocupacion', `reporte-ocupacion-${this.hoy()}.pdf`);
  }

  reservas(desde?: string, hasta?: string, estado?: string) {
    return this.descargar(
      'reservas',
      `reporte-reservas${desde ? '-' + desde : ''}.pdf`,
      this.rango(desde, hasta, estado),
    );
  }

  clientes() {
    return this.descargar('clientes', `reporte-clientes-${this.hoy()}.pdf`);
  }
}
