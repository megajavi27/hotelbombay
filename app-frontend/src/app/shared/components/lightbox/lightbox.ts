import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

const ESCALA_MIN = 1;
const ESCALA_MAX = 5;
const PASO_ESCALA = 0.5;

/**
 * Visor de fotos a pantalla completa, con zoom y arrastre.
 *
 * No se muestra solo: el componente que lo usa lo envuelve en un `@if`, y lo
 * quita al recibir (cerrado). Así no hace falta ni un servicio global ni montar
 * nada en el layout raíz — basta con declararlo donde haya fotos.
 *
 * Atajos: Escape cierra · ←/→ cambian de foto · + y − hacen zoom · 0 lo resetea.
 */
@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './lightbox.html',
})
export class LightboxComponent {
  /** URLs ya resueltas de las fotos de la galería. */
  @Input({ required: true }) imagenes: readonly string[] = [];

  /** Foto por la que se abre el visor. */
  @Input()
  set indiceInicial(valor: number) {
    this.indice.set(valor ?? 0);
    this.resetearZoom();
  }

  @Input() alt = 'Foto de la habitación';

  @Output() cerrado = new EventEmitter<void>();

  indice = signal(0);
  escala = signal(ESCALA_MIN);
  desplazamiento = signal({ x: 0, y: 0 });

  private arrastrando = false;
  private origen = { x: 0, y: 0 };

  readonly escalaMin = ESCALA_MIN;
  readonly escalaMax = ESCALA_MAX;

  actual(): string {
    return this.imagenes[this.indice()] ?? '';
  }

  hayVarias(): boolean {
    return this.imagenes.length > 1;
  }

  /** Transform de la imagen. El translate va después del scale para que el
   *  arrastre se sienta 1:1 con el ratón sea cual sea el nivel de zoom. */
  transformacion(): string {
    const d = this.desplazamiento();
    return `scale(${this.escala()}) translate(${d.x / this.escala()}px, ${d.y / this.escala()}px)`;
  }

  hayZoom(): boolean {
    return this.escala() > ESCALA_MIN;
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  anterior(evento?: Event) {
    evento?.stopPropagation();
    if (!this.hayVarias()) return;
    this.indice.set((this.indice() - 1 + this.imagenes.length) % this.imagenes.length);
    this.resetearZoom();
  }

  siguiente(evento?: Event) {
    evento?.stopPropagation();
    if (!this.hayVarias()) return;
    this.indice.set((this.indice() + 1) % this.imagenes.length);
    this.resetearZoom();
  }

  irA(i: number, evento?: Event) {
    evento?.stopPropagation();
    this.indice.set(i);
    this.resetearZoom();
  }

  cerrar() {
    this.cerrado.emit();
  }

  // ── Zoom ───────────────────────────────────────────────────────────────────

  acercar(evento?: Event) {
    evento?.stopPropagation();
    this.escala.set(Math.min(ESCALA_MAX, this.escala() + PASO_ESCALA));
  }

  alejar(evento?: Event) {
    evento?.stopPropagation();
    const nueva = Math.max(ESCALA_MIN, this.escala() - PASO_ESCALA);
    this.escala.set(nueva);
    // Al volver al tamaño original, la imagen se recentra: si no, queda
    // desplazada fuera de la vista sin forma evidente de recuperarla.
    if (nueva === ESCALA_MIN) this.desplazamiento.set({ x: 0, y: 0 });
  }

  resetearZoom(evento?: Event) {
    evento?.stopPropagation();
    this.escala.set(ESCALA_MIN);
    this.desplazamiento.set({ x: 0, y: 0 });
  }

  /** Un clic en la foto alterna entre tamaño original y 2x. */
  alternarZoom(evento: MouseEvent) {
    evento.stopPropagation();
    if (this.hayZoom()) {
      this.resetearZoom();
    } else {
      this.escala.set(2);
    }
  }

  onRueda(evento: WheelEvent) {
    evento.preventDefault();
    if (evento.deltaY < 0) this.acercar();
    else this.alejar();
  }

  // ── Arrastre (solo con zoom activo) ────────────────────────────────────────

  onRatonAbajo(evento: MouseEvent) {
    if (!this.hayZoom()) return;
    evento.preventDefault();
    this.arrastrando = true;
    const d = this.desplazamiento();
    this.origen = { x: evento.clientX - d.x, y: evento.clientY - d.y };
  }

  onRatonMueve(evento: MouseEvent) {
    if (!this.arrastrando) return;
    evento.preventDefault();
    this.desplazamiento.set({
      x: evento.clientX - this.origen.x,
      y: evento.clientY - this.origen.y,
    });
  }

  onRatonArriba() {
    this.arrastrando = false;
  }

  // ── Teclado ────────────────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onTecla(evento: KeyboardEvent) {
    switch (evento.key) {
      case 'Escape':     this.cerrar();        break;
      case 'ArrowLeft':  this.anterior();      break;
      case 'ArrowRight': this.siguiente();     break;
      case '+':
      case '=':          this.acercar();       break;
      case '-':          this.alejar();        break;
      case '0':          this.resetearZoom();  break;
      default: return;
    }
    evento.preventDefault();
  }
}
