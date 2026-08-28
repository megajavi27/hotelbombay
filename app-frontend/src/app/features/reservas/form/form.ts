import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReservaService } from '@services/reserva.service';
import { ClienteService } from '@services/cliente.service';
import { HabitacionService } from '@services/habitacion.service';
import { NotificationService } from '@services/notification.service';
import { toIsoDate, hoySinHora, fechaFinPosteriorValidator } from '@utils/date.util';
import moment from 'moment';

@Component({
  selector: 'app-reserva-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './form.html'
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(ReservaService);
  private clienteService = inject(ClienteService);
  private habitacionService = inject(HabitacionService);
  private notification = inject(NotificationService);

  form: FormGroup;
  isEditMode = signal(false);
  reservaId: number | null = null;
  clientes = signal<any[]>([]);
  habitaciones = signal<any[]>([]);
  isSaving = signal(false);

  /** Fecha mínima de check-in: solo se restringe al crear una reserva nueva; al editar
   *  una reserva existente se permite conservar sus fechas originales (aunque ya hayan pasado). */
  readonly minDate = hoySinHora();

  constructor() {
    this.form = this.fb.group({
      id_cliente: ['', Validators.required],
      id_habitacion: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      numero_huespedes: [1, [Validators.required, Validators.min(1)]],
      estado: ['PENDIENTE', Validators.required],
      observaciones: ['']
    }, { validators: fechaFinPosteriorValidator('fecha_inicio', 'fecha_fin') });

    this.clienteService.getAll(1,1000).subscribe({ next: (r) => this.clientes.set(r.data) });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.reservaId = +id;
        this.habitacionService.getAll(1,1000).subscribe({ next: (r) => this.habitaciones.set(r.data) });
        this.load(this.reservaId);
      } else {
        this.habitacionService.getDisponibles().subscribe({ next: (data) => this.habitaciones.set(data) });
      }
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

  load(id: number) {
    this.service.getById(id).subscribe({
      next: (r) => {
        this.form.patchValue({
          id_cliente: r.id_cliente,
          id_habitacion: r.id_habitacion,
          fecha_inicio: r.fecha_inicio ? moment(r.fecha_inicio) : null,
          fecha_fin: r.fecha_fin ? moment(r.fecha_fin) : null,
          numero_huespedes: r.numero_huespedes,
          estado: r.estado,
          observaciones: r.observaciones
        });
      },
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar la reserva.')
    });
  }

  onSubmit() {
    if (this.form.invalid && this.form.hasError('fechaFinInvalida')) {
      this.notification.error('La fecha de check-out debe ser posterior a la fecha de check-in.');
    }
    if (this.form.valid) {
      this.isSaving.set(true);

      const formData = { ...this.form.value };
      formData.fecha_inicio = toIsoDate(formData.fecha_inicio);
      formData.fecha_fin = toIsoDate(formData.fecha_fin);

      const request$ = this.isEditMode()
        ? this.service.update(this.reservaId!, formData)
        : this.service.create(formData);

      request$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notification.success('Reserva guardada exitosamente.');
          this.router.navigate(['/reservas']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notification.error(err?.error?.message ?? 'Ocurrió un error al guardar la reserva.');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
