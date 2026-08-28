import moment from 'moment';
import { BadRequestException } from '@nestjs/common';

/**
 * Formatos de fecha estándar de la aplicación (consistentes con el frontend).
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Formatea una fecha (sin hora) usando moment. Devuelve null si no hay valor.
 */
export function formatDate(value?: string | Date | null): string | null {
  if (!value) return null;
  const m = moment(value);
  return m.isValid() ? m.format(DATE_FORMAT) : null;
}

/**
 * Formatea una fecha con hora usando moment. Devuelve null si no hay valor.
 */
export function formatDateTime(value?: string | Date | null): string | null {
  if (!value) return null;
  const m = moment(value);
  return m.isValid() ? m.format(DATETIME_FORMAT) : null;
}

/**
 * Calcula la cantidad de noches (días) entre dos fechas (formato YYYY-MM-DD).
 */
export function diffInDays(fechaInicio: string, fechaFin: string): number {
  return moment(fechaFin, DATE_FORMAT).diff(moment(fechaInicio, DATE_FORMAT), 'days');
}

/**
 * true si la fecha (YYYY-MM-DD) es estrictamente anterior al día de hoy (sin hora).
 */
export function esFechaAnteriorAHoy(fecha: string): boolean {
  const hoy = moment().startOf('day');
  return moment(fecha, DATE_FORMAT).startOf('day').isBefore(hoy);
}

/**
 * true si el string dado es una fecha válida en formato YYYY-MM-DD (estricto).
 */
export function esFechaValida(fecha?: string | null): boolean {
  if (!fecha) return false;
  return moment(fecha, DATE_FORMAT, true).isValid();
}

/**
 * Valida un rango de fechas de reserva (check-in / check-out) y lanza un mensaje
 * de error claro y específico para cada caso inválido. No retorna nada: si las
 * fechas son válidas, simplemente no lanza excepción.
 *
 * Reglas:
 *  - Ninguna fecha puede estar vacía o tener formato inválido.
 *  - El check-in no puede ser anterior al día de hoy.
 *  - El check-out debe ser estrictamente posterior al check-in.
 */
export function validarRangoFechasReserva(
  fechaInicio?: string,
  fechaFin?: string,
  opts: { permitirFechaPasada?: boolean } = {},
): void {
  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
    throw new BadRequestException('Debes indicar una fecha de check-in y de check-out válidas (formato AAAA-MM-DD).');
  }
  // La restricción de "no fechas pasadas" solo aplica al crear/mover una reserva a
  // fechas nuevas. Se puede desactivar (permitirFechaPasada) al editar campos de una
  // reserva ya existente (ej: cambiar observaciones o estado) sin tocar sus fechas,
  // para no bloquear la edición de reservas históricas.
  if (!opts.permitirFechaPasada && esFechaAnteriorAHoy(fechaInicio!)) {
    throw new BadRequestException('La fecha de check-in no puede ser anterior a hoy.');
  }
  if (!moment(fechaFin, DATE_FORMAT).isAfter(moment(fechaInicio, DATE_FORMAT))) {
    throw new BadRequestException('La fecha de check-out debe ser posterior a la fecha de check-in.');
  }
}

interface DateFieldsConfig {
  /** Nombres de columnas tipo DATE (se formatean como YYYY-MM-DD). */
  date?: string[];
  /** Nombres de columnas tipo DATETIME (se formatean como YYYY-MM-DD HH:mm:ss). */
  datetime?: string[];
}

/**
 * Da formato consistente (vía moment) a los campos de fecha de una entidad antes
 * de devolverla en la respuesta de la API. Muta y devuelve el mismo objeto.
 */
export function formatEntityDates<T extends Record<string, any>>(entity: T, fields: DateFieldsConfig): T {
  if (!entity) return entity;
  const target = entity as Record<string, any>;
  for (const field of fields.date ?? []) {
    if (target[field] != null) {
      target[field] = formatDate(target[field]);
    }
  }
  for (const field of fields.datetime ?? []) {
    if (target[field] != null) {
      target[field] = formatDateTime(target[field]);
    }
  }
  return entity;
}

/**
 * Aplica formatEntityDates a una lista de entidades.
 */
export function formatEntityListDates<T extends Record<string, any>>(entities: T[], fields: DateFieldsConfig): T[] {
  return entities.map((entity) => formatEntityDates(entity, fields));
}
