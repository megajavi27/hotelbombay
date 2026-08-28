import { Component, Input, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HabitacionService, HabitacionImagen } from '@services/habitacion.service';
import { NotificationService } from '@services/notification.service';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.service';
import { resolverUrlImagen } from '@utils/imagen.util';
import { LightboxComponent } from '@shared/components/lightbox/lightbox';

/** Límites que aplica el backend; se replican aquí solo para avisar antes de subir. */
const MAX_FOTOS = 15;
const MAX_POR_SUBIDA = 10;
const MAX_MB = 5;

/**
 * Gestor de la galería de una habitación: subir varias fotos, elegir la portada
 * y borrar. Necesita que la habitación ya exista (hace falta su id), así que en
 * el formulario solo se muestra en modo edición.
 */
@Component({
  selector: 'app-galeria-habitacion',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, LightboxComponent],
  templateUrl: './galeria-habitacion.html',
})
export class GaleriaHabitacionComponent {
  private service = inject(HabitacionService);
  private notification = inject(NotificationService);
  private confirm = inject(ConfirmDialogService);

  /** Id de la habitación cuya galería se gestiona. */
  @Input({ required: true })
  set idHabitacion(valor: number) {
    this._idHabitacion = valor;
    if (valor) this.cargar();
  }
  get idHabitacion(): number {
    return this._idHabitacion;
  }
  private _idHabitacion = 0;

  readonly maxFotos = MAX_FOTOS;
  readonly maxPorSubida = MAX_POR_SUBIDA;
  readonly maxMb = MAX_MB;

  imagenes = signal<HabitacionImagen[]>([]);
  isLoading = signal(true);
  isSubiendo = signal(false);

  lightboxAbierto = signal(false);
  indiceLightbox = signal(0);

  url(imagen: HabitacionImagen): string {
    return resolverUrlImagen(imagen.url);
  }

  /** Las mismas fotos que la cuadrícula, en URLs absolutas, para el visor ampliado. */
  urlsAmpliadas(): string[] {
    return this.imagenes().map((imagen) => this.url(imagen));
  }

  ampliar(indice: number) {
    this.indiceLightbox.set(indice);
    this.lightboxAbierto.set(true);
  }

  cargar() {
    this.isLoading.set(true);
    this.service.getImagenes(this._idHabitacion).subscribe({
      next: (lista) => {
        this.imagenes.set(lista);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar las fotos.');
        this.isLoading.set(false);
      },
    });
  }

  onArchivosSeleccionados(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    // Permite volver a elegir el mismo archivo después de un error.
    input.value = '';
    if (archivos.length === 0) return;

    const problema = this.validar(archivos);
    if (problema) {
      this.notification.error(problema);
      return;
    }

    this.isSubiendo.set(true);
    this.service.subirImagenes(this._idHabitacion, archivos).subscribe({
      next: (lista) => {
        this.imagenes.set(lista);
        this.isSubiendo.set(false);
        this.notification.success(
          archivos.length === 1 ? 'Foto subida.' : `${archivos.length} fotos subidas.`,
        );
      },
      error: (err) => {
        this.isSubiendo.set(false);
        this.notification.error(err?.error?.message ?? 'No se pudieron subir las fotos.');
      },
    });
  }

  marcarPortada(imagen: HabitacionImagen) {
    if (imagen.es_portada) return;
    this.service.marcarPortada(this._idHabitacion, imagen.id_imagen).subscribe({
      next: (lista) => {
        this.imagenes.set(lista);
        this.notification.success('Portada actualizada.');
      },
      error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo cambiar la portada.'),
    });
  }

  eliminar(imagen: HabitacionImagen) {
    this.confirm.confirmDelete('esta foto').subscribe((ok) => {
      if (!ok) return;
      this.service.eliminarImagen(this._idHabitacion, imagen.id_imagen).subscribe({
        next: (lista) => {
          this.imagenes.set(lista);
          this.notification.success('Foto eliminada.');
        },
        error: (err) => this.notification.error(err?.error?.message ?? 'No se pudo eliminar la foto.'),
      });
    });
  }

  /** Comprueba en el navegador lo mismo que el backend, para fallar antes de subir. */
  private validar(archivos: File[]): string | null {
    if (archivos.length > MAX_POR_SUBIDA) {
      return `Puedes subir como máximo ${MAX_POR_SUBIDA} fotos a la vez.`;
    }
    if (this.imagenes().length + archivos.length > MAX_FOTOS) {
      const espacio = MAX_FOTOS - this.imagenes().length;
      return espacio <= 0
        ? `Esta habitación ya tiene el máximo de ${MAX_FOTOS} fotos. Borra alguna para subir otra.`
        : `Solo caben ${espacio} foto(s) más en esta habitación.`;
    }
    const pesada = archivos.find((a) => a.size > MAX_MB * 1024 * 1024);
    if (pesada) return `"${pesada.name}" pesa más de ${MAX_MB} MB.`;

    const noEsImagen = archivos.find((a) => !a.type.startsWith('image/'));
    if (noEsImagen) return `"${noEsImagen.name}" no es una imagen.`;

    return null;
  }
}
