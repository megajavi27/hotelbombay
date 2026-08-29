import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Reglas de longitud del número de documento según su tipo.
 *
 * La cédula ecuatoriana tiene exactamente 10 dígitos y el RUC 13 (los 10 de la
 * cédula más "001" del establecimiento). El pasaporte no tiene un formato único
 * en el mundo, así que solo se limita al ancho de la columna: `numero_documento`
 * es VARCHAR(20), y dejar escribir más solo consigue que MySQL corte el valor o
 * rechace el INSERT.
 */
export const LONGITUD_DOCUMENTO: Record<string, number> = {
  CEDULA: 10,
  RUC: 13,
  PASAPORTE: 20,
};

/** Tipos con una longitud fija y solo dígitos. El pasaporte queda fuera. */
const LONGITUD_EXACTA: Record<string, number> = {
  CEDULA: 10,
  RUC: 13,
};

/** Ancho de la columna en la base de datos. Es el tope para cualquier tipo. */
export const MAX_DOCUMENTO = 20;

export const TIPOS_DOCUMENTO = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'RUC', label: 'RUC' },
];

/** Caracteres que admite el input para ese tipo de documento. */
export function longitudDocumento(tipo: string | null | undefined): number {
  return LONGITUD_DOCUMENTO[tipo ?? ''] ?? MAX_DOCUMENTO;
}

/**
 * Valida el número contra el tipo elegido en el control hermano.
 *
 * El `maxlength` del input impide escribir de más, pero no impide pegar un
 * valor corto ni cambiar de tipo después de haber escrito. Este validador es el
 * que realmente garantiza que una cédula tenga sus 10 dígitos.
 */
export function validadorNumeroDocumento(nombreControlTipo = 'tipo_documento'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value ?? '').toString().trim();
    // Si está vacío, el problema es "requerido" y de eso se encarga otro
    // validador. Devolver dos errores para lo mismo solo confunde al usuario.
    if (!valor) return null;

    const tipo = control.parent?.get(nombreControlTipo)?.value ?? 'CEDULA';
    const exacta = LONGITUD_EXACTA[tipo];

    if (!exacta) {
      return valor.length > MAX_DOCUMENTO
        ? { documentoLargo: { maximo: MAX_DOCUMENTO, actual: valor.length } }
        : null;
    }

    if (!/^\d+$/.test(valor)) return { documentoSoloDigitos: true };

    if (valor.length !== exacta) {
      return { documentoLongitud: { requerida: exacta, actual: valor.length, tipo } };
    }

    return null;
  };
}

/** Mensaje listo para mostrar, a partir de los errores del control. */
export function mensajeErrorDocumento(errores: ValidationErrors | null | undefined): string | null {
  if (!errores) return null;
  if (errores['required']) return 'El número de documento es obligatorio.';
  if (errores['documentoSoloDigitos']) return 'Debe contener solo números.';
  if (errores['documentoLongitud']) {
    const { requerida, tipo } = errores['documentoLongitud'];
    const nombre = tipo === 'RUC' ? 'El RUC' : 'La cédula';
    return `${nombre} debe tener exactamente ${requerida} dígitos.`;
  }
  if (errores['documentoLargo']) {
    return `Máximo ${errores['documentoLargo'].maximo} caracteres.`;
  }
  return null;
}
