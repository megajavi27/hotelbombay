import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { longitudDocumento, validadorNumeroDocumento } from '@utils/documento.util';

/**
 * Ajusta el campo del número de documento al tipo seleccionado.
 *
 * Se pone sobre el input y se encarga de todo por su cuenta:
 *
 *     <input matInput hbDocumento formControlName="numero_documento">
 *
 * Busca el control hermano `tipo_documento` dentro del mismo FormGroup y, cada
 * vez que cambia, ajusta el `maxlength` del input (10 para cédula, 13 para RUC,
 * 20 para pasaporte), cambia el teclado a numérico donde corresponde y añade el
 * validador de longitud. Así la regla vive en un solo sitio en lugar de estar
 * repetida en los cuatro formularios que piden un documento.
 *
 * Si el control del tipo se llama distinto, se le pasa el nombre:
 * `hbDocumento="tipo_doc"`.
 */
@Directive({
  selector: 'input[hbDocumento]',
  standalone: true,
})
export class DocumentoDirective implements OnInit, OnDestroy {
  /** Nombre del control hermano con el tipo de documento. */
  nombreControlTipo = input('', { alias: 'hbDocumento' });

  private readonly elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { self: true });
  private suscripcion?: Subscription;

  ngOnInit(): void {
    const control = this.ngControl.control;
    // Un atributo sin valor llega como cadena vacía, no como el valor por
    // defecto del input; por eso se resuelve aquí y no en la declaración.
    const nombre = this.nombreControlTipo() || 'tipo_documento';
    const controlTipo = control?.parent?.get(nombre);
    if (!control || !controlTipo) return;

    control.addValidators(validadorNumeroDocumento(nombre));
    this.aplicarLimite(controlTipo.value);

    // Se difiere un ciclo para no cambiar el estado del formulario en pleno
    // renderizado, que es lo que provoca los avisos de "expression changed".
    queueMicrotask(() => control.updateValueAndValidity({ emitEvent: false }));

    this.suscripcion = controlTipo.valueChanges.subscribe((tipo: string) => {
      this.aplicarLimite(tipo);

      // Al pasar de RUC a cédula lo ya escrito puede sobrar. Se recorta en vez
      // de dejar un valor que el nuevo maxlength ni siquiera dejaría teclear.
      const actual = (control.value ?? '').toString();
      const maximo = longitudDocumento(tipo);
      if (actual.length > maximo) {
        control.setValue(actual.slice(0, maximo));
      }
      control.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  private aplicarLimite(tipo: string): void {
    const input = this.elemento.nativeElement;
    input.maxLength = longitudDocumento(tipo);
    // El pasaporte lleva letras; la cédula y el RUC son solo dígitos, y en el
    // móvil conviene que salga directamente el teclado numérico.
    input.inputMode = tipo === 'PASAPORTE' ? 'text' : 'numeric';
  }
}
