import { PageEvent } from '@angular/material/paginator';

/** Respuesta paginada del backend */
export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Estado de paginación reutilizable.
 * Usar una instancia por cada list component:
 *   pagination = new PaginationState();
 */
export class PaginationState {
  page = 1;
  limit = 10;
  total = 0;
  pageSizeOptions = [5, 10, 25, 50];

  /** Índice base-0 para mat-paginator */
  get pageIndex(): number {
    return this.page - 1;
  }

  /** Actualiza page y limit al recibir un PageEvent de mat-paginator */
  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
  }

  /** Resetea a la primera página (usar al filtrar) */
  reset(): void {
    this.page = 1;
  }
}
