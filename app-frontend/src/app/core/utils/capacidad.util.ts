import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador de control: el número de huéspedes no puede superar la capacidad
 * máxima del tipo de la habitación elegida.
 *
 * El máximo se recibe como función y no como número porque cambia cada vez que
 * el usuario selecciona otra habitación: así el mismo validador sirve durante
 * toda la vida del formulario, sin tener que reasignarlo al control. Después de
 * cambiar de habitación hay que llamar a `updateValueAndValidity()` sobre el
 * control de huéspedes para que se vuelva a evaluar.
 *
 * Devuelve null mientras no haya habitación elegida (todavía no hay límite que
 * aplicar), y `{ capacidadExcedida: { max } }` cuando el número no cabe.
 */
export function capacidadMaximaValidator(getMax: () => number | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const max = getMax();
    const huespedes = Number(control.value);
    if (!max || !Number.isFinite(huespedes) || huespedes <= 0) return null;
    return huespedes > max ? { capacidadExcedida: { max } } : null;
  };
}

/**
 * Capacidad máxima que admite una habitación, leída de su tipo.
 *
 * Devuelve null si la habitación no está cargada o su tipo no define capacidad,
 * para que la falta del dato no bloquee el formulario.
 */
export function capacidadDeHabitacion(
  habitacion: { tipoHabitacion?: { capacidad_maxima?: number } } | null,
): number | null {
  const max = Number(habitacion?.tipoHabitacion?.capacidad_maxima);
  return Number.isFinite(max) && max > 0 ? max : null;
}
