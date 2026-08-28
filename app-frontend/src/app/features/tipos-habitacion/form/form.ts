import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TiposHabitacionService } from '@services/tipos-habitacion.service';
import { NotificationService } from '@services/notification.service';

@Component({
  selector: 'app-tipos-habitacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './form.html'
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TiposHabitacionService);
  private notification = inject(NotificationService);

  form: FormGroup;
  isEditMode = signal(false);
  tipoId: number | null = null;
  isSaving = signal(false);

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      precio_noche: ['', [Validators.required, Validators.min(0)]],
      capacidad_maxima: [2, [Validators.required, Validators.min(1)]],
      servicios: [''],
      imagen_url: [''],
      activo: [true]
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.tipoId = +id;
        this.load(this.tipoId);
      }
    });
  }

  load(id: number) {
    this.service.getById(id).subscribe({
      next: (t) => this.form.patchValue(t),
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar el tipo de habitación.')
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isSaving.set(true);

      const request$ = this.isEditMode()
        ? this.service.update(this.tipoId!, this.form.value)
        : this.service.create(this.form.value);

      request$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notification.success('Tipo de habitación guardado exitosamente.');
          this.router.navigate(['/tipos-habitacion']);
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
