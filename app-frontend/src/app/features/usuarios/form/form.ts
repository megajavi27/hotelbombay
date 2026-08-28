import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UsuarioService } from '@services/usuario.service';
import { NotificationService } from '@services/notification.service';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './form.html'
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuarioService = inject(UsuarioService);
  private notification = inject(NotificationService);

  form: FormGroup;
  isEditMode = signal(false);
  userId: number | null = null;
  isSaving = signal(false);

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      tipo_documento: ['CEDULA', Validators.required],
      numero_documento: ['', Validators.required],
      telefono: [''],
      direccion: [''],
      activo: [true],
      password: ['']
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.userId = +id;
        this.loadUsuario(this.userId);
      } else {
        this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.form.get('password')?.updateValueAndValidity();
      }
    });
  }

  loadUsuario(id: number) {
    this.usuarioService.getById(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          tipo_documento: user.tipo_documento,
          numero_documento: user.numero_documento,
          telefono: user.telefono,
          direccion: user.direccion
        });
      },
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar el usuario.')
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isSaving.set(true);

      const formData = { ...this.form.value };
      if (this.isEditMode() && !formData.password) {
        delete formData.password;
      }

      const request$ = this.isEditMode()
        ? this.usuarioService.update(this.userId!, formData)
        : this.usuarioService.create(formData);

      request$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notification.success('Usuario guardado exitosamente.');
          this.router.navigate(['/usuarios']);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notification.error(err?.error?.message ?? 'Ocurrió un error al guardar el usuario.');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
