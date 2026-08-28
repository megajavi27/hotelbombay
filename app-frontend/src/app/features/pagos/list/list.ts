import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { PagoService } from '@services/pago.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { MotivoRechazoDialogComponent } from './motivo-rechazo-dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../core/environments/environment';

@Component({
  selector: 'app-pago-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    PageLayoutComponent,
  ],
  templateUrl: './list.html'
})
export class ListComponent {
  private service      = inject(PagoService);
  private notification = inject(NotificationService);
  private confirm      = inject(ConfirmDialogService);
  private dialog       = inject(MatDialog);

  pagos      = signal<any[]>([]);
  isLoading  = signal(true);
  pagination = new PaginationState();

  // Filtro estado (client-side sobre la página actual)
  filtroEstado = signal<string | null>(null);
  readonly FILTROS = [
    { label: 'Todos',       value: null },
    { label: 'En revisión', value: 'PENDIENTE_REVISION' },
    { label: 'Completado',  value: 'COMPLETADO' },
    { label: 'Pendiente',   value: 'PENDIENTE' },
    { label: 'Rechazado',   value: 'RECHAZADO' },
  ];

  // Búsqueda por cliente (server-side)
  busqueda = new FormControl('');

  get pagosFiltrados() {
    return this.pagos();
  }

  constructor() {
    this.load();
    this.busqueda.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pagination.reset();
      this.load();
    });
  }

  load() {
    this.isLoading.set(true);
    this.service.getAll(this.pagination.page, this.pagination.limit, {
      busqueda: this.busqueda.value || undefined,
      estado:   this.filtroEstado() || undefined,
    }).subscribe({
      next: (result) => {
        this.pagos.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar los pagos.');
        this.isLoading.set(false);
      }
    });
  }

  setFiltro(valor: string | null) {
    this.filtroEstado.set(valor);
    this.pagination.reset();
    this.load();
  }

  get filtrosActivos(): boolean {
    return !!(this.busqueda.value || this.filtroEstado());
  }

  limpiarBusqueda() {
    this.busqueda.setValue('');
    this.filtroEstado.set(null);
    this.pagination.reset();
    this.load();
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('este pago').subscribe(ok => {
      if (!ok) return;
      this.service.delete(id).subscribe({
        next: () => { this.notification.success('Pago eliminado.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar.')
      });
    });
  }

  estadoBadge(estado: string): string {
    const MAP: Record<string, string> = {
      PENDIENTE:          'hb-badge-warning',
      PENDIENTE_REVISION: 'hb-badge-warning',
      COMPLETADO:         'hb-badge-success',
      RECHAZADO:          'hb-badge-error',
      REEMBOLSADO:        'hb-badge-info',
    };
    return MAP[estado] ?? 'hb-badge-neutral';
  }

  estadoLabel(estado: string): string {
    const MAP: Record<string, string> = {
      PENDIENTE:          'Pendiente',
      PENDIENTE_REVISION: 'En revisión',
      COMPLETADO:         'Completado',
      RECHAZADO:          'Rechazado',
      REEMBOLSADO:        'Reembolsado',
    };
    return MAP[estado] ?? estado;
  }

  apiUrl = environment.filesBaseUrl;

  validar(id: number) {
    this.confirm.confirm('¿Validar este comprobante?', 'La reserva pasará a estado Confirmada.').subscribe(ok => {
      if (!ok) return;
      this.service.validarPago(id).subscribe({
        next: () => { this.notification.success('Pago validado. Reserva confirmada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo validar.')
      });
    });
  }

  cobrarEfectivo(id: number) {
    this.confirm.confirm('¿Registrar cobro en efectivo?', 'El pago se marcará como completado y la reserva como confirmada.').subscribe(ok => {
      if (!ok) return;
      this.service.cobrarEfectivo(id).subscribe({
        next: () => { this.notification.success('Pago en efectivo registrado. Reserva confirmada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo registrar el pago.')
      });
    });
  }

  rechazar(id: number) {
    const ref = this.dialog.open(MotivoRechazoDialogComponent, {
      width: '420px',
      panelClass: 'hb-dialog',
      disableClose: true,
    });
    ref.afterClosed().subscribe((motivo: string | undefined) => {
      if (!motivo) return;
      this.service.rechazarPago(id, motivo).subscribe({
        next: () => { this.notification.success('Comprobante rechazado.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo rechazar.')
      });
    });
  }
}
