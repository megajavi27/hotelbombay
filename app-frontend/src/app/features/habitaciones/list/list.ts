import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { HabitacionService, HabitacionImagen } from '@services/habitacion.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { resolverUrlImagen } from '@utils/imagen.util';

@Component({
  selector: 'app-habitacion-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule, PageLayoutComponent],
  templateUrl: './list.html'
})
export class ListComponent {
  private service      = inject(HabitacionService);
  private notification = inject(NotificationService);
  private confirm      = inject(ConfirmDialogService);

  habitaciones = signal<any[]>([]);
  isLoading = signal(true);
  pagination = new PaginationState();

  constructor() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.service.getAll(this.pagination.page, this.pagination.limit).subscribe({
      next: (result) => {
        this.habitaciones.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar las habitaciones.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('esta habitación').subscribe(ok => {
      if (!ok) return;
      this.service.delete(id).subscribe({
        next: () => { this.notification.success('Habitación eliminada.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar.')
      });
    });
  }

  estadoBadge(estado: string): string {
    return ({ DISPONIBLE:'hb-badge-success', OCUPADA:'hb-badge-error', MANTENIMIENTO:'hb-badge-warning', LIMPIEZA:'hb-badge-info' } as Record<string,string>)[estado] ?? 'hb-badge-neutral';
  }

  /** Miniatura de la habitación: la portada, o la primera foto si aún no hay portada. */
  portada(habitacion: { imagenes?: HabitacionImagen[] }): string {
    const imagenes = habitacion.imagenes ?? [];
    if (imagenes.length === 0) return '';
    const portada = imagenes.find(i => i.es_portada) ?? imagenes[0];
    return resolverUrlImagen(portada.url);
  }

  totalFotos(habitacion: { imagenes?: HabitacionImagen[] }): number {
    return habitacion.imagenes?.length ?? 0;
  }
}
