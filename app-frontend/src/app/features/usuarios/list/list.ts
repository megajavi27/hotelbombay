import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';
import { UsuarioService } from '@services/usuario.service';
import { NotificationService } from '@services/notification.service';
import { PaginationState } from '@utils/pagination.util';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule, PageLayoutComponent],
  templateUrl: './list.html'
})
export class ListComponent {
  private usuarioService = inject(UsuarioService);
  private notification   = inject(NotificationService);
  private confirm        = inject(ConfirmDialogService);

  usuarios = signal<any[]>([]);
  isLoading = signal(true);
  pagination = new PaginationState();

  constructor() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.usuarioService.getAll(this.pagination.page, this.pagination.limit).subscribe({
      next: (result) => {
        this.usuarios.set(result.data);
        this.pagination.total = result.total;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar los usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pagination.onPageChange(event);
    this.load();
  }

  confirmDelete(id: number) {
    this.confirm.confirmDelete('esta cuenta de usuario').subscribe(ok => {
      if (!ok) return;
      this.usuarioService.delete(id).subscribe({
        next: () => { this.notification.success('Usuario eliminado.'); this.load(); },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar la cuenta.')
      });
    });
  }
}
