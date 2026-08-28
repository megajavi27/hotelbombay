import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '@services/auth.service';
import { TiposHabitacionService } from '@services/tipos-habitacion.service';
import { GaleriaVisorComponent } from '@shared/components/galeria-visor/galeria-visor';
import { IMAGEN_HABITACION_DEFAULT } from '@utils/imagen.util';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, GaleriaVisorComponent],
  templateUrl: './landing.html',
})
export class LandingComponent implements OnInit {
  private authService = inject(AuthService);
  private tiposService = inject(TiposHabitacionService);
  private router = inject(Router);

  readonly imagenDefault = IMAGEN_HABITACION_DEFAULT;

  tipos = signal<any[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    // Si ya hay una sesión activa, no tiene sentido mostrarle la landing pública:
    // lo mandamos directo a su panel correspondiente.
    if (this.authService.isLoggedIn()) {
      const tipo = this.authService.getUsuario()?.tipo;
      this.router.navigate([tipo === 'cliente' ? '/mi-inicio' : '/dashboard']);
      return;
    }

    this.tiposService.getPublico().subscribe({
      next: (data) => { this.tipos.set(data); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); },
    });
  }

  /**
   * Fotos que se muestran en la tarjeta de un tipo.
   *
   * El backend reúne aquí las fotos reales de las habitaciones de ese tipo. Si
   * todavía no se ha subido ninguna, se cae en la imagen suelta del catálogo
   * (imagen_url) y, si tampoco la hay, el visor pone la imagen de respaldo.
   */
  imagenesDe(tipo: any): string[] {
    const galeria: string[] = tipo?.imagenes ?? [];
    if (galeria.length > 0) return galeria;
    return tipo?.imagen_url ? [tipo.imagen_url] : [];
  }

  /** "Reservar" en un tipo de habitación: si no hay sesión, va a login/registro
   *  conservando el tipo elegido; si ya hay sesión (no debería llegar aquí), va directo. */
  reservar(tipo: any) {
    const returnUrl = `/mis-reservas/nueva?tipoId=${tipo.id_tipos_habitacion}`;
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }
}
