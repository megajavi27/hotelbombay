import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './registro.html',
})
export class RegistroComponent {
  private fb           = inject(FormBuilder);
  private authService  = inject(AuthService);
  private notification = inject(NotificationService);
  private router       = inject(Router);
  private route        = inject(ActivatedRoute);

  isLoading    = signal(false);
  hidePassword = signal(true);

  /** URL a la que volver tras registrarse (ej: venir de "Reservar" en la página pública). */
  private returnUrl: string | null = null;

  constructor() {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  readonly TIPOS_DOC = [
    { value: 'CEDULA',    label: 'Cédula' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'RUC',       label: 'RUC' },
  ];

  form: FormGroup = this.fb.group({
    nombre:           ['', [Validators.required]],
    apellido:         ['', [Validators.required]],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['', [Validators.required, Validators.minLength(6)]],
    tipo_documento:   ['CEDULA'],
    numero_documento: ['', [Validators.required]],
    telefono:         [''],
  });

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.authService.registroCliente(this.form.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notification.success('¡Cuenta creada! Bienvenido a Hotel Bombay.');
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate(['/mi-inicio']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo crear la cuenta.');
      },
    });
  }
}
