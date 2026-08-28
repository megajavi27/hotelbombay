import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecomendacionIaService } from '@services/recomendacion-ia.service';
import { NotificationService } from '@services/notification.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';

export const CATEGORIAS = [
  { value: 'TURISTICO',       label: 'Turístico',       icon: 'tour'           },
  { value: 'RESTAURANTE',     label: 'Restaurante',     icon: 'restaurant'     },
  { value: 'ENTRETENIMIENTO', label: 'Entretenimiento', icon: 'theater_comedy' },
  { value: 'TRANSPORTE',      label: 'Transporte',      icon: 'directions_bus' },
  { value: 'COMPRAS',         label: 'Compras',         icon: 'shopping_bag'   },
  { value: 'OTRO',            label: 'Otro',            icon: 'category'       },
];

@Component({
  selector: 'app-recomendacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    PageLayoutComponent,
  ],
  templateUrl: './form.html',
})
export class RecomendacionFormComponent {
  private fb           = inject(FormBuilder);
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private svc          = inject(RecomendacionIaService);
  private notification = inject(NotificationService);

  readonly categorias = CATEGORIAS;

  isEditMode = signal(false);
  isSaving   = signal(false);
  itemId: number | null = null;

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      titulo:       ['', [Validators.required, Validators.minLength(3)]],
      categoria:    ['TURISTICO', Validators.required],
      descripcion:  [''],
      ubicacion:    [''],
      distancia_km: [null],
      calificacion: [null, [Validators.min(0), Validators.max(5)]],
      imagen_url:   [''],
      activo:       [true],
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.itemId = +id;
        this.load(this.itemId);
      }
    });
  }

  load(id: number) {
    this.svc.getById(id).subscribe({
      next: (r) => this.form.patchValue(r),
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar la recomendación.')
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);

    const dto = { ...this.form.value };
    if (dto.distancia_km === '' || dto.distancia_km === null) delete dto.distancia_km;
    if (dto.calificacion === '' || dto.calificacion === null) delete dto.calificacion;
    if (!dto.imagen_url) delete dto.imagen_url;

    const req$ = this.isEditMode()
      ? this.svc.update(this.itemId!, dto)
      : this.svc.create(dto);

    req$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notification.success(this.isEditMode() ? 'Recomendación actualizada.' : 'Recomendación creada.');
        this.router.navigate(['/recomendaciones']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'Error al guardar.');
      }
    });
  }
}
