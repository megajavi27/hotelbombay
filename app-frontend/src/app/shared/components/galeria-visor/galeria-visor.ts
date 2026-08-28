import { Component, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IMAGEN_HABITACION_DEFAULT, resolverUrlImagen } from '@utils/imagen.util';
import { LightboxComponent } from '@shared/components/lightbox/lightbox';

/** Acepta tanto rutas sueltas como los objetos que devuelve el backend. */
export type FuenteImagen = string | { url: string };

/**
 * Visor de solo lectura: una foto grande y una tira de miniaturas para cambiarla.
 * Al hacer clic en la foto grande se abre a pantalla completa con zoom.
 *
 * Se usa en la página pública y en el formulario de nueva reserva del cliente.
 * Si no hay fotos muestra la imagen de respaldo, así que se puede colocar sin
 * comprobar antes si la habitación tiene galería.
 */
@Component({
  selector: 'app-galeria-visor',
  standalone: true,
  imports: [MatIconModule, LightboxComponent],
  templateUrl: './galeria-visor.html',
})
export class GaleriaVisorComponent {
  @Input({ required: true })
  set imagenes(valor: readonly FuenteImagen[] | null | undefined) {
    const urls = (valor ?? [])
      .map((item) => (typeof item === 'string' ? item : item?.url))
      .filter((url): url is string => !!url)
      .map((url) => resolverUrlImagen(url));

    this.urls.set(urls);
    this.indice.set(0);
  }

  /** Texto alternativo de las imágenes. */
  @Input() alt = 'Foto de la habitación';

  /** Clase de altura de la foto grande (por defecto la de las tarjetas de la landing). */
  @Input() altura = 'h-48';

  /** Imagen que se usa cuando no hay ninguna foto. */
  @Input() fallback = IMAGEN_HABITACION_DEFAULT;

  urls = signal<string[]>([]);
  indice = signal(0);
  lightboxAbierto = signal(false);

  /** Foto que se muestra en grande; cae en el respaldo si la galería está vacía. */
  actual(): string {
    const lista = this.urls();
    return lista.length > 0 ? (lista[this.indice()] ?? lista[0]) : this.fallback;
  }

  /** Solo tiene sentido ampliar si hay fotos de verdad, no la de respaldo. */
  sePuedeAmpliar(): boolean {
    return this.urls().length > 0;
  }

  seleccionar(i: number) {
    this.indice.set(i);
  }

  abrirLightbox() {
    if (this.sePuedeAmpliar()) this.lightboxAbierto.set(true);
  }

  /** Si una foto no carga, se descarta para no dejar un hueco roto en la tira. */
  onError(urlRota: string) {
    const restantes = this.urls().filter((url) => url !== urlRota);
    this.urls.set(restantes);
    if (this.indice() >= restantes.length) this.indice.set(0);
  }
}
