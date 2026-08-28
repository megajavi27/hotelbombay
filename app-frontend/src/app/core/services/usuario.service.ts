import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PagedResult } from '../utils/pagination.util';
import { environment } from '../environments/environment';

export type TipoDocumento = 'CEDULA' | 'PASAPORTE' | 'RUC';

export interface Usuario {
  id_usuario: number;
  email: string;
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono?: string;
  direccion?: string;
  visible: boolean;
  fecha_creacion?: string;
}

export interface BusquedaDocumentoResult extends Usuario {
  esEmpleado: boolean;
  esCliente: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuario`;

  getAll(page = 1, limit = 10) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PagedResult<any>>(this.apiUrl, { params });
  }

  getById(id: number) {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  /** Busca por tipo y número de documento. Lanza 404 si no existe. */
  buscarPorDocumento(tipo_documento: TipoDocumento, numero_documento: string) {
    const params = new HttpParams()
      .set('tipo_documento', tipo_documento)
      .set('numero_documento', numero_documento);
    return this.http.get<BusquedaDocumentoResult>(`${this.apiUrl}/buscar`, { params });
  }

  create(dto: any) {
    return this.http.post<Usuario>(this.apiUrl, dto);
  }

  update(id: number, dto: any) {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
