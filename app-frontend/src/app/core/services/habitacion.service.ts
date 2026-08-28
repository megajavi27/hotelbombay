import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PagedResult } from '../utils/pagination.util';
import { environment } from '../environments/environment';

/** Una foto de la galería de una habitación, tal como la devuelve el backend. */
export interface HabitacionImagen {
  id_imagen: number;
  id_habitacion: number;
  /** Ruta pública relativa: /uploads/habitacion/... — pásala por resolverUrlImagen(). */
  url: string;
  titulo?: string;
  orden: number;
  es_portada: boolean;
  fecha_creacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HabitacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/habitacion`;

  getAll(page = 1, limit = 10) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PagedResult<any>>(this.apiUrl, { params });
  }

  getDisponibles() {
    return this.http.get<any[]>(`${this.apiUrl}/disponibles`);
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

  // ── Galería de fotos ───────────────────────────────────────────────────────
  // Todas devuelven la galería completa y actualizada, para que el componente
  // no tenga que recargarla por su cuenta después de cada operación.

  getImagenes(idHabitacion: number) {
    return this.http.get<HabitacionImagen[]>(`${this.apiUrl}/${idHabitacion}/imagenes`);
  }

  subirImagenes(idHabitacion: number, archivos: File[]) {
    const fd = new FormData();
    for (const archivo of archivos) {
      fd.append('imagenes', archivo);
    }
    return this.http.post<HabitacionImagen[]>(`${this.apiUrl}/${idHabitacion}/imagenes`, fd);
  }

  eliminarImagen(idHabitacion: number, idImagen: number) {
    return this.http.delete<HabitacionImagen[]>(`${this.apiUrl}/${idHabitacion}/imagenes/${idImagen}`);
  }

  marcarPortada(idHabitacion: number, idImagen: number) {
    return this.http.patch<HabitacionImagen[]>(
      `${this.apiUrl}/${idHabitacion}/imagenes/${idImagen}/portada`,
      {},
    );
  }
}
