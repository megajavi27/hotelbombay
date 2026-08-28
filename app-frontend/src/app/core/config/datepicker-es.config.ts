import { Injectable } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';

/**
 * Textos en español de los calendarios (mat-datepicker).
 *
 * Traduce las etiquetas de navegación y de accesibilidad del componente: el
 * botón que abre el calendario, las flechas de mes/año y el encabezado que
 * cambia entre la vista de días, meses y años.
 *
 * Los nombres de los meses y de los días NO se configuran aquí: vienen del
 * locale de moment, que se carga en `app.config.ts` (`import 'moment/locale/es'`
 * junto con `MAT_DATE_LOCALE: 'es'`). Ambas piezas son necesarias.
 */
@Injectable()
export class DatepickerIntlEs extends MatDatepickerIntl {
  override calendarLabel = 'Calendario';
  override openCalendarLabel = 'Abrir calendario';
  override closeCalendarLabel = 'Cerrar calendario';

  override prevMonthLabel = 'Mes anterior';
  override nextMonthLabel = 'Mes siguiente';
  override prevYearLabel = 'Año anterior';
  override nextYearLabel = 'Año siguiente';
  override prevMultiYearLabel = 'Bloque de años anterior';
  override nextMultiYearLabel = 'Bloque de años siguiente';

  override switchToMonthViewLabel = 'Elegir fecha';
  override switchToMultiYearViewLabel = 'Elegir mes y año';

  override startDateLabel = 'Fecha de inicio';
  override endDateLabel = 'Fecha de fin';
  override comparisonDateLabel = 'Fecha de comparación';

  /** Rango de años que se muestra en la cabecera de la vista multi-año. */
  override formatYearRange(start: string, end: string): string {
    return `${start} – ${end}`;
  }

  /** Mismo rango, leído por los lectores de pantalla. */
  override formatYearRangeLabel(start: string, end: string): string {
    return `${start} a ${end}`;
  }
}
