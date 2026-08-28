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
import { EmpleadoService } from '@services/empleado.service';
import { UsuarioService, BusquedaDocumentoResult } from '@services/usuario.service';
import { NotificationService } from '@services/notification.service';
import { toIsoDate } from '@utils/date.util';
import moment from 'moment';

type Paso = 'buscar' | 'datos';

@Component({
  selector: 'app-empleado-form',
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
  private fb              = inject(FormBuilder);
  private route           = inject(ActivatedRoute);
  private router          = inject(Router);
  private empleadoService = inject(EmpleadoService);
  private usuarioService  = inject(UsuarioService);
  private notification    = inject(NotificationService);

  // ── Modo edición ─────────────────────────────────────────────────────────
  isEditMode  = signal(false);
  empleadoId: number | null = null;

  // ── Flujo búsqueda (solo en modo creación) ────────────────────────────────
  paso            = signal<Paso>('buscar');
  isBuscando      = signal(false);
  isSaving        = signal(false);
  /** null = sin buscar / resultado encontrado; undefined = no existe (nuevo) */
  usuarioHallado  = signal<BusquedaDocumentoResult | null | undefined>(undefined);

  // ── Formularios ──────────────────────────────────────────────────────────
  searchForm: FormGroup;
  form: FormGroup;

  /** Perfiles disponibles (catálogo simple) */
  readonly perfiles = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Gerente' },
    { id: 3, nombre: 'Recepcionista' },
    { id: 4, nombre: 'Ama de llaves' },
    { id: 5, nombre: 'Limpieza' },
    { id: 6, nombre: 'Mantenimiento' },
    { id: 7, nombre: 'Conserje' },
    { id: 8, nombre: 'Seguridad' },
  ];

  constructor() {
    this.searchForm = this.fb.group({
      tipo_documento:  ['CEDULA', Validators.required],
      numero_documento: ['', Validators.required],
    });

    this.form = this.fb.group({
      // Campos de usuario (solo visibles cuando es persona nueva)
      email:            ['', [Validators.required, Validators.email]],
      password:         ['', [Validators.required, Validators.minLength(6)]],
      nombre:           ['', Validators.required],
      apellido:         ['', Validators.required],
      tipo_documento:   ['CEDULA'],
      numero_documento: [''],
      telefono:         [''],
      direccion:        [''],
      // Campos de empleado
      id_perfil:           [null],
      fecha_contratacion:  [''],
      salario:             [''],
      activo:              [true],
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.empleadoId = +id;
        this.paso.set('datos');
        this.form.get('email')?.clearValidators();
        this.form.get('password')?.clearValidators();
        this.form.get('email')?.disable();
        this.form.get('password')?.disable();
        this.loadEmpleado(this.empleadoId);
      } else {
        // Modo creación: empezar en paso búsqueda
        this.paso.set('buscar');
      }
    });
  }

  // ── Búsqueda por documento ────────────────────────────────────────────────
  buscar() {
    if (this.searchForm.invalid) { this.searchForm.markAllAsTouched(); return; }
    const { tipo_documento, numero_documento } = this.searchForm.value;

    this.isBuscando.set(true);
    this.usuarioService.buscarPorDocumento(tipo_documento, numero_documento).subscribe({
      next: (resultado) => {
        this.isBuscando.set(false);
        if (resultado.esEmpleado) {
          // Ya es empleado — no se puede duplicar
          this.notification.error(`${resultado.nombre} ${resultado.apellido} ya está registrado/a como empleado en el sistema.`);
          return;
        }
        // Existe (como cliente u otro) — pre-llenar y avanzar
        this.usuarioHallado.set(resultado);
        this.preLlenarDesdeUsuario(resultado);
        this.paso.set('datos');
      },
      error: (err) => {
        this.isBuscando.set(false);
        if (err?.status === 404) {
          // Persona nueva — pre-llenar solo el documento
          this.usuarioHallado.set(null);
          this.form.patchValue({
            tipo_documento: tipo_documento,
            numero_documento: numero_documento,
          });
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
    // Deshabilitar campos personales — ya existen en el sistema
    ['nombre','apellido','email','tipo_documento','numero_documento','telefono','direccion'].forEach(f => {
      this.form.get(f)?.disable();
    });
    // Password no necesario si el usuario ya existe
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

  // ── Carga para edición ────────────────────────────────────────────────────
  loadEmpleado(id: number) {
    this.empleadoService.getById(id).subscribe({
      next: (e) => {
        this.form.patchValue({
          email:            e.usuario?.email,
          nombre:           e.usuario?.nombre,
          apellido:         e.usuario?.apellido,
          tipo_documento:   e.usuario?.tipo_documento,
          numero_documento: e.usuario?.numero_documento,
          telefono:         e.usuario?.telefono,
          direccion:        e.usuario?.direccion,
          id_perfil:        e.perfil?.id_perfil ?? null,
          fecha_contratacion: e.fecha_contratacion ? moment(e.fecha_contratacion) : null,
          salario:          e.salario,
          activo:           e.activo,
        });
      },
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cargar el empleado.')
    });
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);

    let payload: any;

    if (this.isEditMode()) {
      // Edición: solo campos de empleado
      const v = this.form.getRawValue();
      payload = {
        nombre:            v.nombre,
        apellido:          v.apellido,
        telefono:          v.telefono,
        direccion:         v.direccion,
        id_perfil:         v.id_perfil,
        fecha_contratacion: toIsoDate(v.fecha_contratacion),
        salario:           v.salario,
        activo:            v.activo,
      };
    } else if (this.usuarioHallado()) {
      // Vincular usuario existente
      payload = {
        id_usuario:        this.usuarioHallado()!.id_usuario,
        id_perfil:         this.form.value.id_perfil,
        fecha_contratacion: toIsoDate(this.form.value.fecha_contratacion),
        salario:           this.form.value.salario,
        activo:            this.form.value.activo,
      };
    } else {
      // Persona nueva
      const v = this.form.getRawValue();
      payload = {
        ...v,
        fecha_contratacion: toIsoDate(v.fecha_contratacion),
      };
    }

    const req$ = this.isEditMode()
      ? this.empleadoService.update(this.empleadoId!, payload)
      : this.empleadoService.create(payload);

    req$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notification.success('Empleado guardado exitosamente.');
        this.router.navigate(['/empleados']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'Ocurrió un error al guardar el empleado.');
      }
    });
  }
}
