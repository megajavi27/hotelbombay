import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { DocumentoDirective } from '@shared/directives/documento.directive';
import { mensajeErrorDocumento } from '@utils/documento.util';
import { SelectPaisComponent } from '@shared/components/select-pais/select-pais';

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
    SelectPaisComponent,
    DocumentoDirective,
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
    // Obligatoria y sin valor por defecto: si se precargara "Ecuador" todo el
    // mundo quedaría registrado como ecuatoriano sin haberlo elegido, y el
    // gráfico de nacionalidades del dashboard no diría nada.
    nacionalidad:     ['', [Validators.required]],
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

  /**
   * Mensaje de error del número de documento. La regla depende del tipo elegido
   * (10 dígitos la cédula, 13 el RUC), así que se resuelve en un solo sitio.
   */
  errorDocumento(control: AbstractControl | null): string | null {
    return control?.touched ? mensajeErrorDocumento(control.errors) : null;
  }

}
