import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@services/auth.service';
import { ReservaService } from '@services/reserva.service';
import { TiposHabitacionService } from '@services/tipos-habitacion.service';
import { NotificationService } from '@services/notification.service';
import { CarruselFotosComponent } from '@shared/components/carrusel-fotos/carrusel-fotos';
import { IMAGEN_HABITACION_DEFAULT, resolverUrlImagen } from '@utils/imagen.util';

const ESTADO_LABEL: Partial<Record<string, string>> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  CANCELADA: 'Cancelada',
};
const ESTADO_CLASS: Partial<Record<string, string>> = {
  PENDIENTE:  'hb-badge hb-badge-warn',
  CONFIRMADA: 'hb-badge hb-badge-secondary',
  CHECKIN:    'hb-badge hb-badge-success',
  CHECKOUT:   'hb-badge',
  CANCELADA:  'hb-badge hb-badge-error',
};

/**
 * Tope de fotos del carrusel.
 *
 * Con una foto por tipo de habitación sobra para dar variedad; pasar de ahí solo
 * consigue que el ciclo sea tan largo que nadie llegue a verlo entero, y que el
 * navegador descargue imágenes que no va a mostrar.
 */
const MAX_FOTOS_CARRUSEL = 6;

@Component({
  selector: 'app-mi-inicio',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CarruselFotosComponent,
  ],
  templateUrl: './mi-inicio.html',
})
export class MiInicioComponent {
  auth         = inject(AuthService);
  reservaSvc   = inject(ReservaService);
  tiposSvc     = inject(TiposHabitacionService);
  notification = inject(NotificationService);

  usuario = this.auth.usuario;
  isLoading = signal(true);
  reservasRecientes = signal<any[]>([]);

  private tipos = signal<any[]>([]);

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  /**
   * Fotos del carrusel, tomadas del catálogo público de tipos de habitación.
   *
   * Se reutiliza el mismo endpoint que alimenta la página de inicio pública en
   * vez de crear uno nuevo: ya devuelve las fotos reales de las habitaciones
   * agrupadas por tipo, así que el carrusel se actualiza solo cuando el hotel
   * sube fotos nuevas, sin tocar código.
   *
   * Las fotos se intercalan por tipo: primero la primera de cada tipo, luego la
   * segunda de cada uno, y así. De ese modo se ven habitaciones distintas desde
   * el principio, pero si resulta que solo un tipo tiene fotos cargadas el
   * carrusel igual recibe varias y sigue rotando. Tomar una sola por tipo dejaba
   * el carrusel parado en ese caso, sin nada que animar.
   */
  fotos = computed<string[]>(() => {
    const galerias: string[][] = [];

    for (const tipo of this.tipos()) {
      const galeria: string[] = tipo?.imagenes ?? [];
      const fuente = galeria.length > 0 ? galeria : tipo?.imagen_url ? [tipo.imagen_url] : [];
      if (fuente.length > 0) galerias.push(fuente);
    }

    const urls: string[] = [];
    const maxPorTipo = Math.max(0, ...galerias.map((g) => g.length));

    for (let vuelta = 0; vuelta < maxPorTipo && urls.length < MAX_FOTOS_CARRUSEL; vuelta++) {
      for (const galeria of galerias) {
        if (urls.length >= MAX_FOTOS_CARRUSEL) break;
        const cruda = galeria[vuelta];
        if (!cruda) continue;
        const url = resolverUrlImagen(cruda);
        if (url && !urls.includes(url)) urls.push(url);
      }
    }

    // Sin ninguna foto cargada el banner se vería como un rectángulo vacío, así
    // que se cae en la imagen de respaldo que ya usa el resto de la aplicación.
    return urls.length > 0 ? urls : [IMAGEN_HABITACION_DEFAULT];
  });

  /** Solo el nombre de pila: "Bienvenido, Javier" lee mejor que el nombre completo. */
  primerNombre = computed(() => {
    const completo = this.usuario()?.nombreCompleto ?? '';
    return completo.split(' ')[0] || 'Huésped';
  });

  constructor() {
    this.reservaSvc.getMisReservas(1, 3).subscribe({
      next: (r) => {
        this.reservasRecientes.set(r.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    // Un fallo aquí no debe romper la pantalla: el carrusel es decorativo y el
    // computed ya tiene su imagen de respaldo.
    this.tiposSvc.getPublico().subscribe({
      next: (data) => this.tipos.set(data ?? []),
      error: () => this.tipos.set([]),
    });
  }
}
