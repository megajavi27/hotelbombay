import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

@Component({
  selector: 'app-restablecer-password',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './restablecer-password.html',
})
export class RestablecerPasswordComponent implements OnInit {
  private fb           = inject(FormBuilder);
  private authService  = inject(AuthService);
  private notification = inject(NotificationService);
  private router       = inject(Router);
  private route        = inject(ActivatedRoute);

  isLoading    = signal(false);
  exitoso      = signal(false);
  hidePassword = signal(true);
  token        = '';

  form: FormGroup = this.fb.group({
    password:  ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', [Validators.required]],
  });

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.notification.error('Enlace inválido. Solicita uno nuevo.');
      this.router.navigate(['/olvide-password']);
    }
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { password, confirmar } = this.form.value;
    if (password !== confirmar) {
      this.notification.error('Las contraseñas no coinciden.');
      return;
    }
    this.isLoading.set(true);
    this.authService.restablecerPassword(this.token, password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.exitoso.set(true);
        this.notification.success(res.mensaje);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo restablecer la contraseña.');
      },
    });
  }
}
