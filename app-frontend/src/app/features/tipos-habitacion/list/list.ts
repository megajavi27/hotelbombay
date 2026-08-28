import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { TiposHabitacionService } from '@services/tipos-habitacion.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-tipos-habitacion-list',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatPaginatorModule, PageLayoutComponent],
  templateUrl: './list.html'
})
export class ListComponent {
  private service      = inject(TiposHabitacionService);
  private notification = inject(NotificationService);
  private confirm      = inject(ConfirmDialogService);

  tipos = signal<any[]>([]);
  isLoading = signal(true);
  pagination = new PaginationState();

  constructor() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.service.getAll(this.pagination.page, this.pagination.limit).subscribe({
      next: (result) => {
        this.tipos.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar los tipos de habitación.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('este tipo de habitación').subscribe(ok => {
      if (!ok) return;
      this.service.delete(id).subscribe({
        next: () => { this.notification.success('Tipo de habitación eliminado.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar.')
      });
    });
  }
}
