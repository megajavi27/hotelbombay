import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ReservaService } from '@services/reserva.service';
import { PagoService } from '@services/pago.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { formatDate, toIsoDate } from '@utils/date.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-reserva-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    PageLayoutComponent,
  ],
  templateUrl: './list.html'
})
export class ListComponent {
  private service      = inject(ReservaService);
  private pagoService  = inject(PagoService);
  private notification = inject(NotificationService);
  private confirm      = inject(ConfirmDialogService);

  reservas  = signal<any[]>([]);
  isLoading = signal(true);
  pagination = new PaginationState();

  // Filtros
  busqueda     = new FormControl('');
  fechaInicio  = new FormControl<any>(null);
  fechaFin     = new FormControl<any>(null);
  filtroEstado = signal<string | null>(null);

  readonly ESTADOS = [
    { label: 'Todos',      value: null,         badge: '' },
    { label: 'Pendiente',  value: 'PENDIENTE',  badge: 'hb-badge-warning' },
    { label: 'Confirmada', value: 'CONFIRMADA', badge: 'hb-badge-info' },
    { label: 'Check-in',   value: 'CHECKIN',    badge: 'hb-badge-success' },
    { label: 'Check-out',  value: 'CHECKOUT',   badge: 'hb-badge-neutral' },
    { label: 'Cancelada',  value: 'CANCELADA',  badge: 'hb-badge-error' },
  ];

  constructor() {
    this.load();

    // Búsqueda por cliente con debounce
    this.busqueda.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pagination.reset();
      this.load();
    });
  }

  get filtrosActivos(): boolean {
    return !!(this.busqueda.value || this.fechaInicio.value || this.fechaFin.value || this.filtroEstado());
  }

  setEstado(valor: string | null) {
    this.filtroEstado.set(valor);
    this.pagination.reset();
    this.load();
  }

  load() {
    this.isLoading.set(true);
    const fi = this.fechaInicio.value ? (toIsoDate(this.fechaInicio.value) as string) : undefined;
    const ff = this.fechaFin.value   ? (toIsoDate(this.fechaFin.value)    as string) : undefined;

    this.service.getAll(this.pagination.page, this.pagination.limit, {
      busqueda:     this.busqueda.value || undefined,
      fecha_inicio: fi,
      fecha_fin:    ff,
      estado:       this.filtroEstado() || undefined,
    }).subscribe({
      next: (result) => {
        this.reservas.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar las reservas.');
        this.isLoading.set(false);
      }
    });
  }

  buscarFechas() {
    this.pagination.reset();
    this.load();
  }

  limpiarFiltros() {
    this.busqueda.setValue('');
    this.fechaInicio.setValue(null);
    this.fechaFin.setValue(null);
    this.filtroEstado.set(null);
    this.pagination.reset();
    this.load();
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  cobrarEfectivo(id_reserva: number) {
    this.confirm.confirm('¿Registrar pago en efectivo?', 'La reserva pasará a CONFIRMADA.').subscribe(ok => {
      if (!ok) return;
      this.pagoService.cobrarEfectivoReserva(id_reserva).subscribe({
        next: () => { this.notification.success('Pago en efectivo registrado. Reserva confirmada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo registrar el pago.')
      });
    });
  }

  cobrarEfectivoReserva(idReserva: number) {
    this.confirm.confirm('¿Cobrar en efectivo?', 'El pago se registrará como completado y la reserva quedará Confirmada.').subscribe(ok => {
      if (!ok) return;
      this.pagoService.cobrarEfectivoPorReserva(idReserva).subscribe({
        next: () => { this.notification.success('Pago en efectivo registrado. Reserva confirmada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo registrar el pago.')
      });
    });
  }

  checkIn(id: number) {
    this.confirm.confirm('¿Confirmar Check-in?', 'La reserva pasará a estado Check-in y la habitación quedará como Ocupada.').subscribe(ok => {
      if (!ok) return;
      this.service.checkIn(id).subscribe({
        next: () => { this.notification.success('Check-in realizado exitosamente.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo realizar el check-in.')
      });
    });
  }

  checkOut(id: number) {
    this.confirm.confirm('¿Confirmar Check-out?', 'La reserva pasará a estado Check-out y la habitación quedará Disponible.').subscribe(ok => {
      if (!ok) return;
      this.service.checkOut(id).subscribe({
        next: () => { this.notification.success('Check-out realizado exitosamente.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo realizar el check-out.')
      });
    });
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('esta reserva').subscribe(ok => {
      if (!ok) return;
      this.service.delete(id).subscribe({
        next: () => { this.notification.success('Reserva eliminada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar.')
      });
    });
  }

  estadoBadge(estado: string): string {
    return ({ PENDIENTE:'hb-badge-warning', CONFIRMADA:'hb-badge-info', CHECKIN:'hb-badge-success', CHECKOUT:'hb-badge-neutral', CANCELADA:'hb-badge-error' } as Record<string,string>)[estado] ?? 'hb-badge-neutral';
  }

  formatDate(value: unknown): string { return formatDate(value); }
}
