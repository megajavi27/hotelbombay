import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ReservaService } from '@services/reserva.service';
import { PagoService } from '@services/pago.service';
import { NotificationService } from '@services/notification.service';

function detectCardType(num: string): { tipo: string; icon: string; color: string } {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n))          return { tipo: 'VISA',       icon: 'credit_card', color: '#1a1f71' };
  if (/^5[1-5]/.test(n))     return { tipo: 'MASTERCARD', icon: 'credit_card', color: '#eb001b' };
  if (/^3[47]/.test(n))      return { tipo: 'AMEX',       icon: 'credit_card', color: '#007bc1' };
  if (/^6(?:011|5)/.test(n)) return { tipo: 'DISCOVER',   icon: 'credit_card', color: '#e65c00' };
  return { tipo: '',          icon: 'credit_card', color: '#6b7280' };
}

function formatCardNumber(val: string): string {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0,2)}/${digits.slice(2)}`;
  return digits;
}

@Component({
  selector: 'app-pago-reserva',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './pago.html',
})
export class PagoReservaComponent {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private fb           = inject(FormBuilder);
  private reservaSvc   = inject(ReservaService);
  private pagoSvc      = inject(PagoService);
  private notification = inject(NotificationService);

  reservaId   = signal<number>(0);
  reserva     = signal<any | null>(null);
  isLoading   = signal(true);
  isSaving    = signal(false);
  pagado      = signal(false);
  comprobante = signal<string>('');

  // 'tarjeta' | 'transferencia'
  metodo = signal<'tarjeta' | 'transferencia'>('tarjeta');

  // Tarjeta
  cardInfo = signal(detectCardType(''));
  form: FormGroup;

  // Transferencia
  referencia              = new FormControl('');
  archivoComprobante      = signal<File | null>(null);
  archivoNombre           = signal<string>('');
  pendienteRevision       = signal(false);

  // Datos bancarios del hotel (ajusta según tu banco real)
  readonly DATOS_BANCO = {
    banco:   'Banco Pichincha',
    cuenta:  '2200123456',
    tipo:    'Corriente',
    titular: 'Hotel Bombay S.A.',
    ruc:     '0990123456001',
  };

  constructor() {
    this.form = this.fb.group({
      numero_tarjeta:    ['', [Validators.required, Validators.minLength(19)]],
      nombre_tarjeta:    ['', [Validators.required, Validators.minLength(3)]],
      fecha_expiracion:  ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      cvv:               ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      cuotas:            [1, Validators.required],
    });

    this.form.get('numero_tarjeta')?.valueChanges.subscribe(v => {
      const formatted = formatCardNumber(v ?? '');
      if (formatted !== v) this.form.get('numero_tarjeta')?.setValue(formatted, { emitEvent: false });
      this.cardInfo.set(detectCardType(formatted));
    });

    this.form.get('fecha_expiracion')?.valueChanges.subscribe(v => {
      const formatted = formatExpiry(v ?? '');
      if (formatted !== v) this.form.get('fecha_expiracion')?.setValue(formatted, { emitEvent: false });
    });

    this.route.paramMap.subscribe(p => {
      const id = Number(p.get('id'));
      this.reservaId.set(id);

      const stateReserva = history.state?.reserva;
      if (stateReserva && stateReserva.id_reserva === id) {
        this.reserva.set(stateReserva);
        this.isLoading.set(false);
      } else {
        this.reservaSvc.getMisReservas(1, 100).subscribe({
          next: (res) => {
            const found = res.data.find((r: any) => r.id_reserva === id);
            if (found) { this.reserva.set(found); }
            else { this.notification.error('No se encontró la reserva.'); }
            this.isLoading.set(false);
          },
          error: () => { this.notification.error('No se pudo cargar la reserva.'); this.isLoading.set(false); }
        });
      }
    });
  }

  cardDisplay   = computed(() => this.form?.get('numero_tarjeta')?.value || '**** **** **** ****');
  nameDisplay   = computed(() => this.form?.get('nombre_tarjeta')?.value || 'NOMBRE TITULAR');
  expiryDisplay = computed(() => this.form?.get('fecha_expiracion')?.value || 'MM/YY');

  // ── Tarjeta ────────────────────────────────────────────────────────────────

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);

    const v = this.form.getRawValue();
    const raw = v.numero_tarjeta.replace(/\s/g, '');

    this.pagoSvc.pagarMiReserva({
      id_reserva:    this.reservaId(),
      nombre_tarjeta: v.nombre_tarjeta,
      ultimos_4:     raw.slice(-4),
      cuotas:        Number(v.cuotas),
      tipo_tarjeta:  this.cardInfo().tipo || undefined,
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.comprobante.set(res.codigo_comprobante);
        this.pagado.set(true);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo procesar el pago.');
      },
    });
  }

  // ── Transferencia ──────────────────────────────────────────────────────────

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.archivoComprobante.set(file);
    this.archivoNombre.set(file?.name ?? '');
  }

  onSubmitTransferencia() {
    const archivo = this.archivoComprobante();
    if (!archivo) { this.notification.error('Debes adjuntar el comprobante de transferencia.'); return; }
    this.isSaving.set(true);

    this.pagoSvc.registrarTransferencia(
      this.reservaId(),
      this.referencia.value ?? '',
      archivo,
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.pendienteRevision.set(true);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudo registrar la transferencia.');
      },
    });
  }

  irAMisReservas() {
    this.router.navigate(['/mis-reservas']);
  }
}
