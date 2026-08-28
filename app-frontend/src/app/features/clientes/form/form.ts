import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClienteService } from '@services/cliente.service';
import { UsuarioService, BusquedaDocumentoResult } from '@services/usuario.service';
import { NotificationService } from '@services/notification.service';
import { toIsoDate } from '@utils/date.util';
import moment from 'moment';

type Paso = 'buscar' | 'datos';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './form.html'
})
export class FormComponent {
  private fb             = inject(FormBuilder);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private clienteService = inject(ClienteService);
  private usuarioService = inject(UsuarioService);
  private notification   = inject(NotificationService);

  isEditMode = signal(false);
  clienteId: number | null = null;

  paso           = signal<Paso>('buscar');
  isBuscando     = signal(false);
  isSaving       = signal(false);
  /** undefined = sin buscar aún; null = persona nueva (404); objeto = encontrado */
  usuarioHallado = signal<BusquedaDocumentoResult | null | undefined>(undefined);

  searchForm: FormGroup;
  form: FormGroup;

  constructor() {
    this.searchForm = this.fb.group({
      tipo_documento:   ['CEDULA', Validators.required],
      numero_documento: ['', Validators.required],
    });

    this.form = this.fb.group({
      email:            ['', [Validators.required, Validators.email]],
      password:         ['', [Validators.required, Validators.minLength(6)]],
      nombre:           ['', Validators.required],
      apellido:         ['', Validators.required],
      tipo_documento:   ['CEDULA'],
      numero_documento: [''],
      telefono:         [''],
      direccion:        [''],
      nacionalidad:     [''],
      fecha_nacimiento: [''],
      activo:           [true],
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.clienteId = +id;
        this.paso.set('datos');
        this.form.get('email')?.clearValidators();
        this.form.get('password')?.clearValidators();
        this.form.get('email')?.disable();
        this.form.get('password')?.disable();
        this.loadCliente(this.clienteId);
      } else {
        this.paso.set('buscar');
      }
    });
  }

  buscar() {
    if (this.searchForm.invalid) { this.searchForm.markAllAsTouched(); return; }
    const { tipo_documento, numero_documento } = this.searchForm.value;

    this.isBuscando.set(true);
    this.usuarioService.buscarPorDocumento(tipo_documento, numero_documento).subscribe({
      next: (resultado) => {
        this.isBuscando.set(false);
        if (resultado.esCliente) {
          this.notification.error(`${resultado.nombre} ${resultado.apellido} ya está registrado/a como cliente en el sistema.`);
          return;
        }
        this.usuarioHallado.set(resultado);
        this.preLlenarDesdeUsuario(resultado);
        this.paso.set('datos');
      },
      error: (err) => {
        this.isBuscando.set(false);
        if (err?.status === 404) {
          this.usuarioHallado.set(null);
          this.form.patchValue({ tipo_documento, numero_documento });
          this.paso.set('datos');
        } else {
          this.notification.error('Error al buscar. Intente nuevamente.');
        }
      }
    });
  }

  private preLlenarDesdeUsuario(u: BusquedaDocumentoResult) {
    this.form.patchValue({
      nombre:           u.nombre,
      apellido:         u.apellido,
      email:            u.email,
      tipo_documento:   u.tipo_documento,
      numero_documento: u.numero_documento,
      telefono:         u.telefono ?? '',
      direccion:        u.direccion ?? '',
    });
    ['nombre','apellido','email','tipo_documento','numero_documento','telefono','direccion'].forEach(f => {
      this.form.get(f)?.disable();
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
  }

  volverABuscar() {
    this.paso.set('buscar');
    this.usuarioHallado.set(undefined);
    this.form.reset({ tipo_documento: 'CEDULA', activo: true });
    ['nombre','apellido','email','tipo_documento','numero_documento','telefono','direccion'].forEach(f => {
      this.form.get(f)?.enable();
    });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
  }

  loadCliente(id: number) {
    this.clienteService.getById(id).subscribe({
      next: (c) => {
        this.form.patchValue({
          email:            c.usuario?.email,
          nombre:           c.usuario?.nombre,
          apellido:         c.usuario?.apellido,
          tipo_documento:   c.usuario?.tipo_documento,
          numero_documento: c.usuario?.numero_documento,
          telefono:         c.usuario?.telefono,
          direccion:        c.usuario?.direccion,
          nacionalidad:     c.nacionalidad,
          fecha_nacimiento: c.fecha_nacimiento ? moment(c.fecha_nacimiento) : null,
          activo:           c.activo,
        });
      },
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar el cliente.')
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);

    let payload: any;

    if (this.isEditMode()) {
      const v = this.form.getRawValue();
      payload = {
        nombre:           v.nombre,
        apellido:         v.apellido,
        telefono:         v.telefono,
        direccion:        v.direccion,
        nacionalidad:     v.nacionalidad,
        fecha_nacimiento: toIsoDate(v.fecha_nacimiento),
        activo:           v.activo,
      };
    } else if (this.usuarioHallado()) {
      payload = {
        id_usuario:       this.usuarioHallado()!.id_usuario,
        nacionalidad:     this.form.value.nacionalidad,
        fecha_nacimiento: toIsoDate(this.form.value.fecha_nacimiento),
        activo:           this.form.value.activo,
      };
    } else {
      const v = this.form.getRawValue();
      payload = { ...v, fecha_nacimiento: toIsoDate(v.fecha_nacimiento) };
    }

    const req$ = this.isEditMode()
      ? this.clienteService.update(this.clienteId!, payload)
      : this.clienteService.create(payload);

    req$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notification.success('Cliente guardado exitosamente.');
        this.router.navigate(['/clientes']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'Ocurrió un error al guardar el cliente.');
      }
    });
  }
}
