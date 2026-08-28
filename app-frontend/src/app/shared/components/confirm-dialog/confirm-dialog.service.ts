import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private dialog = inject(MatDialog);

  open(data: ConfirmDialogData): Observable<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '380px',
      panelClass: 'hb-dialog',
      disableClose: true,
    });
    return ref.afterClosed();
  }

  /** Shortcut para confirmar eliminación */
  confirmDelete(itemName: string): Observable<boolean> {
    return this.open({
      title: '¿Eliminar registro?',
      message: `¿Estás seguro de que deseas eliminar ${itemName}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      confirmColor: 'warn',
      icon: 'delete_forever',
    });
  }

  /** Shortcut genérico */
  confirm(title: string, message: string, confirmLabel = 'Confirmar', icon = 'check_circle'): Observable<boolean> {
    return this.open({ title, message, confirmLabel, cancelLabel: 'Cancelar', confirmColor: 'primary', icon });
  }

  /** Shortcut para confirmar cancelación de reserva */
  confirmCancel(message?: string): Observable<boolean> {
    return this.open({
      title: '¿Cancelar reserva?',
      message: message ?? '¿Estás seguro de que deseas cancelar esta reserva?',
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No, volver',
      confirmColor: 'warn',
      icon: 'cancel',
    });
  }
}
