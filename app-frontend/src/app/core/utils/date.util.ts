import moment from 'moment';
import type { MatDateFormats } from '@angular/material/core';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Formato de fecha estándar de la aplicación (consistente con el backend): YYYY-MM-DD.
 * Se usa tanto para mostrar fechas en tablas como para los mat-datepicker (vía moment).
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm';

/** Formatos de fecha para los componentes de Angular Material (mat-datepicker, etc.) usando moment. */
export const HB_MOMENT_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: DATE_FORMAT,
  },
  display: {
    dateInput: DATE_FORMAT,
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

/**
 * Convierte un valor de mat-datepicker (Moment, Date o string) al formato YYYY-MM-DD
 * que espera el backend. Devuelve el valor original si no se puede interpretar como fecha.
 */
export function toIsoDate(value: unknown): unknown {
  if (!value) return value;
  const m = moment(value as moment.MomentInput);
  return m.isValid() ? m.format(DATE_FORMAT) : value;
}

/** Formatea una fecha (string/Date/Moment) como YYYY-MM-DD para mostrarla en listas. */
export function formatDate(value: unknown): string {
  if (!value) return '';
  const m = moment(value as moment.MomentInput);
  return m.isValid() ? m.format(DATE_FORMAT) : String(value);
}

/** Formatea una fecha con hora (string/Date/Moment) como YYYY-MM-DD HH:mm para mostrarla en listas. */
export function formatDateTime(value: unknown): string {
  if (!value) return '';
  const m = moment(value as moment.MomentInput);
  return m.isValid() ? m.format(DATETIME_FORMAT) : String(value);
}

/** Medianoche de hoy — usar como `[min]` de los mat-datepicker de check-in. */
export function hoySinHora(): Date {
  return moment().startOf('day').toDate();
}

/**
 * Validador de FormGroup: exige que el control `fechaFinKey` sea una fecha
 * estrictamente posterior al control `fechaInicioKey`. Se coloca a nivel de grupo
 * (no de control individual) porque compara dos campos entre sí.
 * Error resultante: `{ fechaFinInvalida: true }` en el FormGroup.
 */
export function fechaFinPosteriorValidator(fechaInicioKey: string, fechaFinKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const inicio = group.get(fechaInicioKey)?.value;
    const fin = group.get(fechaFinKey)?.value;
    if (!inicio || !fin) return null;
    const mInicio = moment(inicio as moment.MomentInput);
    const mFin = moment(fin as moment.MomentInput);
    if (!mInicio.isValid() || !mFin.isValid()) return null;
    return mFin.isAfter(mInicio, 'day') ? null : { fechaFinInvalida: true };
  };
}
