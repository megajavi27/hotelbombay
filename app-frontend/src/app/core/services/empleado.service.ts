import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PagedResult } from '../utils/pagination.util';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/empleado`;

  getAll(page = 1, limit = 10) {
    const params = new HttpParams().set('page', page).set('limit', limit);
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
}
