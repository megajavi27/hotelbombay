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
import { ClienteService } from '@services/cliente.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-cliente-list',
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
    PageLayoutComponent,
  ],
  templateUrl: './list.html'
})
export class ListComponent {
  private clienteService = inject(ClienteService);
  private notification   = inject(NotificationService);
  private confirm        = inject(ConfirmDialogService);

  clientes   = signal<any[]>([]);
  isLoading  = signal(true);
  pagination = new PaginationState();

  busqueda    = new FormControl('');
  filtroActivo = signal<boolean | null>(null);

  readonly FILTROS = [
    { label: 'Todos',    value: null },
    { label: 'Activos',  value: true },
    { label: 'Inactivos', value: false },
  ];

  get filtrosActivos(): boolean {
    return !!(this.busqueda.value || this.filtroActivo() !== null);
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
    this.clienteService.getAll(this.pagination.page, this.pagination.limit, {
      busqueda: this.busqueda.value || undefined,
      activo:   this.filtroActivo() !== null ? (this.filtroActivo() as boolean) : undefined,
    }).subscribe({
      next: (result) => {
        this.clientes.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar los clientes.');
        this.isLoading.set(false);
      }
    });
  }

  setFiltroActivo(valor: boolean | null) {
    this.filtroActivo.set(valor);
    this.pagination.reset();
    this.load();
  }

  limpiarFiltros() {
    this.busqueda.setValue('');
    this.filtroActivo.set(null);
    this.pagination.reset();
    this.load();
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('este cliente').subscribe(ok => {
      if (!ok) return;
      this.clienteService.delete(id).subscribe({
        next: () => { this.notification.success('Cliente eliminado.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar el cliente.')
      });
    });
  }
}
