import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ReservaService } from '@services/reserva.service';
import { NotificationService } from '@services/notification.service';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { toIsoDate } from '@utils/date.util';

const ESTADO_LABEL: Partial<Record<string, string>> = {
  PENDIENTE:  'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN:    'Check-in',
  CHECKOUT:   'Check-out',
  CANCELADA:  'Cancelada',
};
const ESTADO_CLASS: Partial<Record<string, string>> = {
  PENDIENTE:  'hb-badge hb-badge-warn',
  CONFIRMADA: 'hb-badge hb-badge-secondary',
  CHECKIN:    'hb-badge hb-badge-success',
  CHECKOUT:   'hb-badge',
  CANCELADA:  'hb-badge hb-badge-error',
};

@Component({
  selector: 'app-mis-reservas-list',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  templateUrl: './list.html',
})
export class MisReservasListComponent {
  private reservaSvc   = inject(ReservaService);
  private notification = inject(NotificationService);
  private confirm      = inject(ConfirmDialogService);
  private router       = inject(Router);

  isLoading  = signal(true);
  reservas   = signal<any[]>([]);
  pagination = { total: 0, page: 1, limit: 10, pageIndex: 0, pageSizeOptions: [10, 25] };

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  // Filtros
  filtroEstado = signal<string | null>(null);
  fechaInicio  = new FormControl<any>(null);
  fechaFin     = new FormControl<any>(null);

  readonly ESTADOS = [
    { label: 'Todas',      value: null },
    { label: 'Pendiente',  value: 'PENDIENTE' },
    { label: 'Confirmada', value: 'CONFIRMADA' },
    { label: 'Check-in',   value: 'CHECKIN' },
    { label: 'Check-out',  value: 'CHECKOUT' },
    { label: 'Cancelada',  value: 'CANCELADA' },
  ];

  get filtrosActivos(): boolean {
    return !!(this.filtroEstado() || this.fechaInicio.value || this.fechaFin.value);
  }

  constructor() { this.load(); }

  load() {
    this.isLoading.set(true);
    const fi = this.fechaInicio.value ? (toIsoDate(this.fechaInicio.value) as string) : undefined;
    const ff = this.fechaFin.value   ? (toIsoDate(this.fechaFin.value)    as string) : undefined;
    this.reservaSvc.getMisReservas(this.pagination.page, this.pagination.limit, {
      estado:       this.filtroEstado() || undefined,
      fecha_inicio: fi,
      fecha_fin:    ff,
    }).subscribe({
      next: (r) => {
        this.reservas.set(r.data);
        this.pagination.total = r.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar tus reservas.');
        this.isLoading.set(false);
      },
    });
  }

  setEstado(valor: string | null) {
    this.filtroEstado.set(valor);
    this.pagination.page      = 1;
    this.pagination.pageIndex = 0;
    this.load();
  }

  buscarFechas() {
    this.pagination.page      = 1;
    this.pagination.pageIndex = 0;
    this.load();
  }

  limpiarFiltros() {
    this.filtroEstado.set(null);
    this.fechaInicio.setValue(null);
    this.fechaFin.setValue(null);
    this.pagination.page      = 1;
    this.pagination.pageIndex = 0;
    this.load();
  }

  onPageChange(e: PageEvent) {
    this.pagination.page      = e.pageIndex + 1;
    this.pagination.limit     = e.pageSize;
    this.pagination.pageIndex = e.pageIndex;
    this.load();
  }

  pagar(r: any) {
    this.router.navigate(['/mis-reservas', r.id_reserva, 'pagar'], { state: { reserva: r } });
  }

  cancelar(r: any) {
    const pagada = r.estado === 'CONFIRMADA' || r.estado === 'CHECKIN';
    const mensaje = pagada
      ? 'Esta reserva ya tiene pago. Se cambiará a CANCELADA y se procesará el reembolso en 5-7 días hábiles.'
      : 'Esta reserva aún no ha sido pagada. Se eliminará del sistema.';
    this.confirm.confirmCancel(mensaje).subscribe(ok => {
      if (!ok) return;
      this.reservaSvc.cancelarMiReserva(r.id_reserva).subscribe({
        next: (res) => {
          this.notification.success(res.mensaje);
          this.load();
        },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cancelar la reserva.'),
      });
    });
  }

  /** Puede pagar si no tiene pago COMPLETADO ni PENDIENTE_REVISION */
  puedesPagar(r: any): boolean {
    const estadoPago = r.pago?.estado;
    return estadoPago !== 'COMPLETADO' && estadoPago !== 'PENDIENTE_REVISION'
      && r.estado !== 'CANCELADA' && r.estado !== 'CHECKOUT';
  }

  /** Puede cancelar si no está CANCELADA, CHECKOUT, ni tiene pago en revisión */
  puedesCancelar(r: any): boolean {
    if (r.estado === 'CANCELADA' || r.estado === 'CHECKOUT' || r.estado === 'CHECKIN') return false;
    if (r.pago?.estado === 'PENDIENTE_REVISION') return false;
    return true;
  }

  /** Comprobante en revisión */
  enRevision(r: any): boolean {
    return r.pago?.estado === 'PENDIENTE_REVISION';
  }

  /** Pago rechazado → puede volver a pagar */
  pagoRechazado(r: any): boolean {
    return r.pago?.estado === 'RECHAZADO';
  }

  /** Pago pendiente (reserva creada pero sin pago completado) */
  pagoPendiente(r: any): boolean {
    return r.pago?.estado === 'PENDIENTE' || (!r.pago && r.estado !== 'CANCELADA' && r.estado !== 'CHECKOUT');
  }
}
