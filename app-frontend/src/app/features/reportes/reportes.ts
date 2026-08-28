import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { ReporteService } from '@services/reporte.service';
import { NotificationService } from '@services/notification.service';
import { toIsoDate } from '@utils/date.util';

const ESTADOS_RESERVA = [
  { label: 'Todos',      value: '' },
  { label: 'Pendiente',  value: 'PENDIENTE' },
  { label: 'Confirmada', value: 'CONFIRMADA' },
  { label: 'Check-in',   value: 'CHECKIN' },
  { label: 'Check-out',  value: 'CHECKOUT' },
  { label: 'Cancelada',  value: 'CANCELADA' },
];

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageLayoutComponent,
  ],
  templateUrl: './reportes.html',
})
export class ReportesComponent {
  private service      = inject(ReporteService);
  private notification = inject(NotificationService);

  readonly ESTADOS = ESTADOS_RESERVA;

  // Loading state por reporte
  loadingVentas   = signal(false);
  loadingEfectivo = signal(false);
  loadingOcupacion = signal(false);
  loadingReservas = signal(false);
  loadingClientes = signal(false);

  // Filtros compartidos ventas / efectivo
  ventasDesde  = new FormControl<any>(null);
  ventasHasta  = new FormControl<any>(null);
  efectivoDesde = new FormControl<any>(null);
  efectivoHasta = new FormControl<any>(null);

  // Filtros reservas
  reservasDesde  = new FormControl<any>(null);
  reservasHasta  = new FormControl<any>(null);
  reservasEstado = new FormControl('');

  private iso(ctrl: FormControl): string | undefined {
    return ctrl.value ? (toIsoDate(ctrl.value) as string) : undefined;
  }

  descargarVentas() {
    this.loadingVentas.set(true);
    this.service.ventas(this.iso(this.ventasDesde), this.iso(this.ventasHasta)).subscribe({
      next: () => { this.loadingVentas.set(false); this.notification.success('Reporte de ingresos descargado.'); },
      error: (err) => { this.loadingVentas.set(false); this.notification.error(err?.error?.message ?? 'Error al generar el reporte.'); },
    });
  }

  descargarEfectivo() {
    this.loadingEfectivo.set(true);
    this.service.efectivo(this.iso(this.efectivoDesde), this.iso(this.efectivoHasta)).subscribe({
      next: () => { this.loadingEfectivo.set(false); this.notification.success('Reporte de efectivo descargado.'); },
      error: (err) => { this.loadingEfectivo.set(false); this.notification.error(err?.error?.message ?? 'Error al generar el reporte.'); },
    });
  }

  descargarOcupacion() {
    this.loadingOcupacion.set(true);
    this.service.ocupacion().subscribe({
      next: () => { this.loadingOcupacion.set(false); this.notification.success('Reporte de ocupación descargado.'); },
      error: (err) => { this.loadingOcupacion.set(false); this.notification.error(err?.error?.message ?? 'Error al generar el reporte.'); },
    });
  }

  descargarReservas() {
    this.loadingReservas.set(true);
    const estado = this.reservasEstado.value || undefined;
    this.service.reservas(this.iso(this.reservasDesde), this.iso(this.reservasHasta), estado).subscribe({
      next: () => { this.loadingReservas.set(false); this.notification.success('Reporte de reservas descargado.'); },
      error: (err) => { this.loadingReservas.set(false); this.notification.error(err?.error?.message ?? 'Error al generar el reporte.'); },
    });
  }

  descargarClientes() {
    this.loadingClientes.set(true);
    this.service.clientes().subscribe({
      next: () => { this.loadingClientes.set(false); this.notification.success('Reporte de clientes descargado.'); },
      error: (err) => { this.loadingClientes.set(false); this.notification.error(err?.error?.message ?? 'Error al generar el reporte.'); },
    });
  }
}
