import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

@Component({
  selector: 'app-olvide-password',
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
  templateUrl: './olvide-password.html',
})
export class OlvidePasswordComponent {
  private authService  = inject(AuthService);
  private notification = inject(NotificationService);

  isLoading = signal(false);
  enviado   = signal(false);

  email = new FormControl('', [Validators.required, Validators.email]);

  onSubmit() {
    if (this.email.invalid) { this.email.markAsTouched(); return; }
    this.isLoading.set(true);
    this.authService.olvidePassword(this.email.value!).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.enviado.set(true);
        this.notification.success(res.mensaje);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo procesar la solicitud.');
      },
    });
  }
}
