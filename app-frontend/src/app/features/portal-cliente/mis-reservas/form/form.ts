import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DecimalPipe } from '@angular/common';
import { ReservaService } from '@services/reserva.service';
import { HabitacionService } from '@services/habitacion.service';
import { NotificationService } from '@services/notification.service';
import { toIsoDate, hoySinHora, fechaFinPosteriorValidator } from '@utils/date.util';
import { capacidadDeHabitacion, capacidadMaximaValidator } from '@utils/capacidad.util';
import { GaleriaVisorComponent } from '@shared/components/galeria-visor/galeria-visor';

@Component({
  selector: 'app-nueva-reserva-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    GaleriaVisorComponent,
  ],
  templateUrl: './form.html',
})
export class NuevaReservaFormComponent {
  private fb           = inject(FormBuilder);
  private router       = inject(Router);
  private route        = inject(ActivatedRoute);
  private reservaSvc   = inject(ReservaService);
  private habitSvc     = inject(HabitacionService);
  private notification = inject(NotificationService);

  isSaving       = signal(false);
  habitaciones   = signal<any[]>([]);
  habitacionSel  = signal<any | null>(null);

  /** Cuántas personas admite el tipo de la habitación elegida. null mientras no haya habitación. */
  capacidadMaxima = computed(() => capacidadDeHabitacion(this.habitacionSel()));

  /** Tipo de habitación preseleccionado al venir desde la página pública ("Reservar" en una tarjeta). */
  readonly tipoIdPreseleccionado: number | null = (() => {
    const raw = this.route.snapshot.queryParamMap.get('tipoId');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  })();

  /** true si la lista de habitaciones mostrada está filtrada por el tipo preseleccionado. */
  filtradoPorTipo = signal(false);

  /** Fecha mínima seleccionable para el check-in: hoy (no se permiten fechas pasadas). */
  readonly minDate = hoySinHora();

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      id_habitacion:    [null, Validators.required],
      fecha_inicio:     [null, Validators.required],
      fecha_fin:        [null, Validators.required],
      numero_huespedes: [1, [Validators.required, Validators.min(1), capacidadMaximaValidator(() => this.capacidadMaxima())]],
      observaciones:    [''],
    }, { validators: fechaFinPosteriorValidator('fecha_inicio', 'fecha_fin') });

    this.habitSvc.getDisponibles().subscribe({
      next: (list) => {
        if (this.tipoIdPreseleccionado) {
          const filtradas = list.filter(h => h.tipoHabitacion?.id_tipos_habitacion === this.tipoIdPreseleccionado);
          if (filtradas.length > 0) {
            this.habitaciones.set(filtradas);
            this.filtradoPorTipo.set(true);
            if (filtradas.length === 1) {
              this.form.get('id_habitacion')?.setValue(filtradas[0].id_habitacion);
            }
          } else {
            // No hay disponibilidad de ese tipo en este momento: mostramos todas y avisamos.
            this.habitaciones.set(list);
            this.notification.error('No hay habitaciones disponibles del tipo seleccionado en este momento. Elige otra opción.');
          }
        } else {
          this.habitaciones.set(list);
        }
      },
      error: () => this.notification.error('No se pudieron cargar las habitaciones disponibles.'),
    });

    this.form.get('id_habitacion')?.valueChanges.subscribe(id => {
      const hab = this.habitaciones().find(h => h.id_habitacion === id) ?? null;
      this.habitacionSel.set(hab);
    });

    // Revalida los huéspedes cada vez que cambia el límite, para que el aviso
    // aparezca al elegir una habitación más pequeña y no solo al escribir.
    effect(() => {
      this.capacidadMaxima();
      this.form.get('numero_huespedes')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  /** Quita el filtro por tipo de habitación y muestra todas las disponibles. */
  quitarFiltroTipo() {
    this.filtradoPorTipo.set(false);
    this.habitSvc.getDisponibles().subscribe({
      next: (list) => this.habitaciones.set(list),
      error: () => this.notification.error('No se pudieron cargar las habitaciones disponibles.'),
    });
  }

  /** Fecha mínima seleccionable para el check-out: el día siguiente al check-in elegido (o hoy, si aún no hay check-in). */
  get minDateFin(): Date {
    const fi = this.form.get('fecha_inicio')?.value;
    if (!fi) return this.minDate;
    const d = new Date(fi);
    d.setDate(d.getDate() + 1);
    return d;
  }

  calcularTotal(): number {
    const hab = this.habitacionSel();
    if (!hab) return 0;
    const fi = this.form.value.fecha_inicio;
    const ff = this.form.value.fecha_fin;
    if (!fi || !ff) return 0;
    const ms = new Date(ff).getTime() - new Date(fi).getTime();
    const noches = Math.round(ms / 86400000);
    if (noches <= 0) return 0;
    return Number(hab.tipoHabitacion?.precio_noche ?? 0) * noches;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.hasError('fechaFinInvalida')) {
        this.notification.error('La fecha de check-out debe ser posterior a la fecha de check-in.');
      }
      return;
    }
    this.isSaving.set(true);
    const v = this.form.getRawValue();
    const payload = {
      id_habitacion:    v.id_habitacion,
      fecha_inicio:     toIsoDate(v.fecha_inicio),
      fecha_fin:        toIsoDate(v.fecha_fin),
      numero_huespedes: v.numero_huespedes,
      observaciones:    v.observaciones || undefined,
    };
    this.reservaSvc.create(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notification.success('¡Reserva creada exitosamente!');
        this.router.navigate(['/mis-reservas']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo crear la reserva.');
      },
    });
  }
}
