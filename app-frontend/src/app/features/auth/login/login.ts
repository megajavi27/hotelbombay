import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

type TipoLogin = 'empleado' | 'cliente';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRippleModule
  ],
  templateUrl: './login.html'
})
export class LoginComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private notification= inject(NotificationService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  tipoLogin = signal<TipoLogin>('empleado');
  isLoading  = signal(false);
  hidePassword = signal(true);

  /** URL a la que volver tras iniciar sesión (ej: venir de "Reservar" en la página pública). */
  private returnUrl: string | null = null;

  constructor() {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    // Solo tiene sentido volver a una reserva/portal si el usuario entra como cliente;
    // si el returnUrl viene de una acción pública, preseleccionamos ese tipo de login.
    if (this.returnUrl) {
      this.tipoLogin.set('cliente');
    }
  }

  form: FormGroup = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  seleccionarTipo(tipo: TipoLogin) {
    this.tipoLogin.set(tipo);
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isLoading.set(true);
    const { email, password } = this.form.value;

    const login$ = this.tipoLogin() === 'empleado'
      ? this.authService.loginEmpleado(email, password)
      : this.authService.loginCliente(email, password);

    login$.subscribe({
      next: () => {
        this.isLoading.set(false);
        const tipo = this.authService.usuario()?.tipo;
        if (this.returnUrl && tipo === 'cliente') {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate([tipo === 'cliente' ? '/mi-inicio' : '/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err?.error?.message ?? 'Credenciales inválidas o error de conexión.');
      }
    });
  }
}
