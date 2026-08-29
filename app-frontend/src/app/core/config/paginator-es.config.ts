import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/**
 * Textos en español del paginador (mat-paginator).
 *
 * Angular Material trae el paginador en inglés y no lo traduce con el locale:
 * hay que reemplazar la clase `MatPaginatorIntl` entera, que es lo que hace
 * este archivo. Se registra una sola vez en `app.config.ts` y a partir de ahí
 * lo heredan todas las listas del sistema.
 */
@Injectable()
export class PaginatorIntlEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Registros por página:';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  /**
   * Texto del rango: "11 – 20 de 47".
   *
   * Se calcula el final con `Math.min` en lugar de `inicio + tamaño` porque la
   * última página casi nunca está completa: sin eso, una lista de 47 registros
   * de diez en diez anunciaría "41 – 50 de 47".
   */
  override getRangeLabel = (pagina: number, tamano: number, total: number): string => {
    if (total === 0) return 'Sin registros';
    if (tamano === 0) return `0 de ${total}`;

    const inicio = pagina * tamano;
    const fin = Math.min(inicio + tamano, total);

    return `${inicio + 1} – ${fin} de ${total}`;
  };
}
