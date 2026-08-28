import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-motivo-rechazo-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="p-6 flex flex-col gap-5">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <mat-icon class="text-red-600">cancel</mat-icon>
        </div>
        <div>
          <h2 class="font-display text-lg font-bold text-on-surface">Rechazar comprobante</h2>
          <p class="text-sm text-on-surface-variant">Indica el motivo para que el cliente pueda corregirlo.</p>
        </div>
      </div>

      <!-- Campo motivo -->
      <mat-form-field class="w-full">
        <mat-label>Motivo de rechazo</mat-label>
        <textarea matInput [formControl]="motivo" rows="4"
                  placeholder="Ej. El monto no coincide con el total de la reserva."></textarea>
        @if (motivo.hasError('required') && motivo.touched) {
          <mat-error>El motivo es obligatorio.</mat-error>
        }
        @if (motivo.hasError('minlength') && motivo.touched) {
          <mat-error>Escribe al menos 10 caracteres.</mat-error>
        }
      </mat-form-field>

      <!-- Acciones -->
      <div class="flex justify-end gap-2">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button color="warn" (click)="confirmar()">
          <mat-icon>cancel</mat-icon>
          Rechazar
        </button>
      </div>
    </div>
  `,
})
export class MotivoRechazoDialogComponent {
  private ref = inject(MatDialogRef<MotivoRechazoDialogComponent>);

  motivo = new FormControl('', [Validators.required, Validators.minLength(10)]);

  cancelar() {
    this.ref.close(undefined);
  }

  confirmar() {
    this.motivo.markAsTouched();
    if (this.motivo.invalid) return;
    this.ref.close(this.motivo.value!);
  }
}
