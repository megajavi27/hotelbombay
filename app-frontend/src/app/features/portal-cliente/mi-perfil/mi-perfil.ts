import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ClienteService } from '@services/cliente.service';
import { NotificationService } from '@services/notification.service';
import { toIsoDate } from '@utils/date.util';
import moment from 'moment';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './mi-perfil.html',
})
export class MiPerfilComponent {
  private clienteSvc   = inject(ClienteService);
  private notification = inject(NotificationService);
  private fb           = inject(FormBuilder);

  isLoading = signal(true);
  isSaving  = signal(false);
  cliente   = signal<any | null>(null);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      nombre:           [{ value: '', disabled: true }],
      apellido:         [{ value: '', disabled: true }],
      email:            [{ value: '', disabled: true }],
      tipo_documento:   [{ value: '', disabled: true }],
      numero_documento: [{ value: '', disabled: true }],
      telefono:         [''],
      direccion:        [''],
      nacionalidad:     [''],
      fecha_nacimiento: [''],
    });

    this.clienteSvc.getMiPerfil().subscribe({
      next: (c) => {
        this.cliente.set(c);
        this.form.patchValue({
          nombre:           c.usuario?.nombre,
          apellido:         c.usuario?.apellido,
          email:            c.usuario?.email,
          tipo_documento:   c.usuario?.tipo_documento,
          numero_documento: c.usuario?.numero_documento,
          telefono:         c.usuario?.telefono ?? '',
          direccion:        c.usuario?.direccion ?? '',
          nacionalidad:     c.nacionalidad ?? '',
          fecha_nacimiento: c.fecha_nacimiento ? moment(c.fecha_nacimiento) : null,
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudo cargar tu perfil.');
        this.isLoading.set(false);
      },
    });
  }

  onSubmit() {
    this.isSaving.set(true);
    const v = this.form.getRawValue();
    const payload = {
      telefono:         v.telefono,
      direccion:        v.direccion,
      nacionalidad:     v.nacionalidad,
      fecha_nacimiento: toIsoDate(v.fecha_nacimiento),
    };
    this.clienteSvc.updateMiPerfil(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notification.success('Perfil actualizado correctamente.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo actualizar el perfil.');
      },
    });
  }
}
