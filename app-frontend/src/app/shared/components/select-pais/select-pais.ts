import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { PAISES, normalizarTexto } from '../../../core/data/paises';

/** Teclas que debe seguir manejando el desplegable y no la caja de búsqueda. */
const TECLAS_DE_NAVEGACION = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'];

/**
 * Selector de país con buscador dentro del desplegable.
 *
 * Con casi 200 países una lista simple es inservible: hay que desplazarse a
 * ciegas hasta encontrar el que se busca. Este componente añade una caja de
 * texto fija en la parte superior del panel que filtra según se escribe, sin
 * tildes ni mayúsculas, de manera que "peru" encuentra "Perú".
 *
 * Se usa igual que cualquier control de un formulario reactivo:
 *
 *     <app-select-pais formControlName="nacionalidad" [requerido]="true" />
 *
 * Por dentro mantiene su propio FormControl y lo sincroniza con el de fuera.
 * Eso es lo que permite que `mat-form-field` pinte el borde rojo y el mensaje
 * de error con el mismo aspecto que el resto de los campos del formulario.
 */
@Component({
  selector: 'app-select-pais',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './select-pais.html',
})
export class SelectPaisComponent implements ControlValueAccessor {
  etiqueta = input('Nacionalidad');
  requerido = input(false);

  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  private cajaBusqueda = viewChild<ElementRef<HTMLInputElement>>('cajaBusqueda');

  /** Control que alimenta al mat-select y del que cuelga el estado de error. */
  readonly control = new FormControl<string | null>(null);

  filtro = signal('');
  /** Copia del valor como señal, para que la lista filtrada pueda reaccionar. */
  private valorActual = signal<string | null>(null);

  private alCambiar: (valor: string | null) => void = () => {};
  private alTocar: () => void = () => {};

  /**
   * El país seleccionado se mantiene siempre entre las opciones aunque el filtro
   * no lo incluya. Si desapareciera, mat-select se quedaría sin la opción que
   * corresponde al valor y el campo se vería vacío pese a tener contenido.
   */
  paisesVisibles = computed<string[]>(() => {
    const busqueda = normalizarTexto(this.filtro());
    const lista = busqueda
      ? PAISES.filter((pais) => normalizarTexto(pais).includes(busqueda))
      : [...PAISES];

    const actual = this.valorActual();
    if (actual && !lista.includes(actual)) lista.unshift(actual);
    return lista;
  });

  constructor() {
    // Se registra como accesor a mano en vez de con NG_VALUE_ACCESSOR: así el
    // componente conserva la referencia a NgControl y puede copiar el estado de
    // "tocado" al control interno, que es el que dispara el mensaje de error.
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    if (this.requerido()) {
      this.control.setValidators(Validators.required);
      this.control.updateValueAndValidity({ emitEvent: false });
    }

    this.control.valueChanges.subscribe((valor) => {
      this.valorActual.set(valor);
      this.alCambiar(valor);
    });
  }

  // ── ControlValueAccessor ───────────────────────────────────────────────────

  writeValue(valor: string | null): void {
    this.valorActual.set(valor ?? null);
    this.control.setValue(valor ?? null, { emitEvent: false });
  }

  registerOnChange(fn: (valor: string | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    if (deshabilitado) this.control.disable({ emitEvent: false });
    else this.control.enable({ emitEvent: false });
  }

  // ── Interacción ────────────────────────────────────────────────────────────

  /** Al abrir enfoca el buscador; al cerrar lo limpia y marca el campo tocado. */
  alAbrirCerrar(abierto: boolean): void {
    if (abierto) {
      // El panel todavía no existe en el momento del evento; se espera un ciclo.
      setTimeout(() => this.cajaBusqueda()?.nativeElement.focus());
      return;
    }
    this.filtro.set('');
    this.control.markAsTouched();
    this.alTocar();
  }

  /**
   * Impide que las letras lleguen al mat-select.
   *
   * Sin esto, el desplegable interpreta cada tecla como su propia búsqueda por
   * inicial y salta de opción mientras se escribe en la caja. Las teclas de
   * navegación sí se dejan pasar para poder moverse y elegir con el teclado.
   */
  alTeclear(evento: KeyboardEvent): void {
    if (!TECLAS_DE_NAVEGACION.includes(evento.key)) evento.stopPropagation();
  }

  actualizarFiltro(evento: Event): void {
    this.filtro.set((evento.target as HTMLInputElement).value);
  }
}
