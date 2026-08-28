import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HabitacionService } from '@services/habitacion.service';
import { TiposHabitacionService } from '@services/tipos-habitacion.service';
import { NotificationService } from '@services/notification.service';
import { GaleriaHabitacionComponent } from '@shared/components/galeria-habitacion/galeria-habitacion';

@Component({
  selector: 'app-habitacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    GaleriaHabitacionComponent
  ],
  templateUrl: './form.html'
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(HabitacionService);
  private tiposService = inject(TiposHabitacionService);
  private notification = inject(NotificationService);

  form: FormGroup;
  isEditMode = signal(false);
  habitacionId: number | null = null;
  tipos = signal<any[]>([]);
  isSaving = signal(false);

  constructor() {
    this.form = this.fb.group({
      numero: ['', Validators.required],
      piso: [''],
      id_tipos_habitacion: ['', Validators.required],
      estado: ['DISPONIBLE', Validators.required],
      observaciones: ['']
    });

    this.tiposService.getAll(1,1000).subscribe({ next: (r) => this.tipos.set(r.data) });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.habitacionId = +id;
        this.load(this.habitacionId);
      }
    });
  }

  load(id: number) {
    this.service.getById(id).subscribe({
      next: (h) => this.form.patchValue({ ...h, id_tipos_habitacion: h.id_tipos_habitacion }),
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar la habitación.')
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isSaving.set(true);

      const request$ = this.isEditMode()
        ? this.service.update(this.habitacionId!, this.form.value)
        : this.service.create(this.form.value);

      request$.subscribe({
        next: (habitacion) => {
          this.isSaving.set(false);
          this.notification.success('Habitación guardada exitosamente.');
          // Al crear, en vez de volver al listado se pasa a modo edición: es la
          // única forma de subir fotos, porque la galería necesita el id.
          if (!this.isEditMode() && habitacion?.id_habitacion) {
            this.router.navigate(['/habitaciones/editar', habitacion.id_habitacion]);
            return;
          }
          this.router.navigate(['/habitaciones']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notification.error(err?.error?.message ?? 'Ocurrió un error al guardar.');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
