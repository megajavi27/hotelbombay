import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'warn' = botón rojo (eliminar), 'primary' = azul (confirmar) */
  confirmColor?: 'warn' | 'primary';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-sm">
      <div class="flex items-start gap-4 mb-4">
        <div class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
             [class]="data.confirmColor === 'warn' ? 'bg-red-100' : 'bg-primary/10'">
          <mat-icon [class]="data.confirmColor === 'warn' ? 'text-red-600' : 'text-primary'">
            {{ data.icon ?? (data.confirmColor === 'warn' ? 'delete_forever' : 'help_outline') }}
          </mat-icon>
        </div>
        <div>
          <h2 class="font-display text-lg font-bold text-on-surface">{{ data.title }}</h2>
          <p class="text-sm text-on-surface-variant mt-1">{{ data.message }}</p>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <button mat-button (click)="cancel()">{{ data.cancelLabel ?? 'Cancelar' }}</button>
        <button mat-flat-button [color]="data.confirmColor ?? 'primary'" (click)="confirm()">
          {{ data.confirmLabel ?? 'Confirmar' }}
        </button>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  confirm() { this.dialogRef.close(true); }
  cancel()  { this.dialogRef.close(false); }
}
