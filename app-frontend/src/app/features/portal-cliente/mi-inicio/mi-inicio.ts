import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@services/auth.service';
import { ReservaService } from '@services/reserva.service';
import { NotificationService } from '@services/notification.service';

const ESTADO_LABEL: Partial<Record<string, string>> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  CANCELADA: 'Cancelada',
};
const ESTADO_CLASS: Partial<Record<string, string>> = {
  PENDIENTE:  'hb-badge hb-badge-warn',
  CONFIRMADA: 'hb-badge hb-badge-secondary',
  CHECKIN:    'hb-badge hb-badge-success',
  CHECKOUT:   'hb-badge',
  CANCELADA:  'hb-badge hb-badge-error',
};

@Component({
  selector: 'app-mi-inicio',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './mi-inicio.html',
})
export class MiInicioComponent {
  auth        = inject(AuthService);
  reservaSvc  = inject(ReservaService);
  notification = inject(NotificationService);

  usuario = this.auth.usuario;
  isLoading = signal(true);
  reservasRecientes = signal<any[]>([]);

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  constructor() {
    this.reservaSvc.getMisReservas(1, 3).subscribe({
      next: (r) => {
        this.reservasRecientes.set(r.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
