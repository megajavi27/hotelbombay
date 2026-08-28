import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { EmpleadoService } from '@services/empleado.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule, PageLayoutComponent],
  templateUrl: './list.html'
})
export class ListComponent {
  private empleadoService = inject(EmpleadoService);
  private notification    = inject(NotificationService);
  private confirm         = inject(ConfirmDialogService);

  empleados = signal<any[]>([]);
  isLoading = signal(true);
  pagination = new PaginationState();

  constructor() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.empleadoService.getAll(this.pagination.page, this.pagination.limit).subscribe({
      next: (result) => {
        this.empleados.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar los empleados.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('este empleado').subscribe(ok => {
      if (!ok) return;
      this.empleadoService.delete(id).subscribe({
        next: () => { this.notification.success('Empleado eliminado.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar el empleado.')
      });
    });
  }
}
