import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PagoService } from '@services/pago.service';
import { ReservaService } from '@services/reserva.service';
import { NotificationService } from '@services/notification.service';

@Component({
  selector: 'app-pago-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './form.html'
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PagoService);
  private reservaService = inject(ReservaService);
  private notification = inject(NotificationService);

  form: FormGroup;
  isEditMode = signal(false);
  pagoId: number | null = null;
  reservas = signal<any[]>([]);
  isSaving = signal(false);

  constructor() {
    this.form = this.fb.group({
      id_reserva: ['', Validators.required],
      monto: ['', [Validators.required, Validators.min(0)]],
      metodo_pago: ['EFECTIVO', Validators.required],
      estado: ['PENDIENTE', Validators.required],
      referencia: ['']
    });

    this.reservaService.getAll(1,1000).subscribe({ next: (r) => this.reservas.set(r.data) });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.pagoId = +id;
        this.load(this.pagoId);
      }
    });
  }

  load(id: number) {
    this.service.getById(id).subscribe({
      next: (p) => this.form.patchValue(p),
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar el pago.')
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isSaving.set(true);

      const request$ = this.isEditMode()
        ? this.service.update(this.pagoId!, this.form.value)
        : this.service.create(this.form.value);

      request$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notification.success('Pago guardado exitosamente.');
          this.router.navigate(['/pagos']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notification.error(err?.error?.message ?? 'Ocurrió un error al guardar el pago.');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
