import { Component, OnDestroy, computed, effect, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Milisegundos que se muestra cada foto antes de pasar a la siguiente. */
const INTERVALO_POR_DEFECTO = 4000;

/**
 * Duración de la transición.
 *
 * Tiene que coincidir con la de las animaciones de `carrusel-fotos.css`: es el
 * tiempo que la foto saliente —y el mosaico, cuando lo hay— siguen en el DOM
 * antes de retirarse. Si aquí fuera menor, la salida se cortaría a media
 * animación.
 */
const DURACION_TRANSICION = 800;

/**
 * Fotos que deben estar descargadas antes de empezar a rotar.
 *
 * Con dos basta: la que se ve y la que entra en la primera transición. Esperar a
 * todas retrasaría el arranque sin necesidad, y no esperar a ninguna es peor
 * todavía —la animación se ejecuta sobre una imagen que aún no ha llegado, así
 * que la foto aparece de golpe cuando termina de bajar y no se ve ningún efecto—.
 */
const FOTOS_MINIMAS_PRECARGADAS = 2;

/**
 * Efectos de transición disponibles.
 *
 * Los seis primeros animan la foto entera. Los dos últimos la trocean en
 * celdas que aparecen escalonadas, que es el efecto de "cuadrícula": para eso
 * hace falta la capa de mosaico, porque una sola etiqueta <img> no se puede
 * partir en pedazos con CSS.
 */
const EFECTOS = [
  'fundido',
  'izquierda',
  'derecha',
  'arriba',
  'acercar',
  'alejar',
  'cuadricula',
  'persianas',
] as const;

type Efecto = (typeof EFECTOS)[number];

/** Efectos que se dibujan troceando la foto, con su rejilla. */
const MOSAICOS: Partial<Record<Efecto, { columnas: number; filas: number; paso: number }>> = {
  // 24 celdas que aparecen salteadas: el efecto "cuadrícula".
  cuadricula: { columnas: 6, filas: 4, paso: 17 },
  // 8 columnas que caen de arriba abajo, una detrás de otra.
  persianas: { columnas: 8, filas: 1, paso: 55 },
};

/** Una celda del mosaico: qué trozo de la foto muestra y cuándo entra. */
interface Celda {
  posicion: string;
  tamano: string;
  retardo: number;
}

/**
 * Carrusel de fotos con avance automático y transiciones variadas.
 *
 *     <app-carrusel-fotos [fotos]="fotos()" />
 *
 * Cada cambio elige al azar uno de ocho efectos —fundido, tres desplazamientos,
 * dos zooms, cuadrícula y persianas—, evitando repetir el mismo dos veces
 * seguidas para que no se note el sorteo. Las fotos se apilan en la misma
 * posición y se animan una sobre otra, así que funcionan igual aunque tengan
 * proporciones distintas.
 *
 * No empieza a rotar hasta tener descargadas las primeras fotos, porque animar
 * una imagen que todavía está bajando no se ve como una transición: se ve como
 * un salto.
 */
@Component({
  selector: 'app-carrusel-fotos',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './carrusel-fotos.html',
  styleUrl: './carrusel-fotos.css',
})
export class CarruselFotosComponent implements OnDestroy {
  fotos = input<string[]>([]);
  intervalo = input(INTERVALO_POR_DEFECTO);
  /** Texto para lectores de pantalla y para el `alt` de cada imagen. */
  descripcion = input('Foto del hotel');

  indice = signal(0);
  pausado = signal(false);

  /** Falso mientras se descargan las primeras fotos. */
  listo = signal(false);

  /** Foto que se está retirando. `null` cuando no hay transición en curso. */
  saliente = signal<number | null>(null);

  /** Efecto de la transición actual. Lo lee el CSS desde el contenedor. */
  efecto = signal<Efecto>('fundido');

  private temporizador?: ReturnType<typeof setInterval>;
  private limpiezaSaliente?: ReturnType<typeof setTimeout>;
  private precargadas = new Set<string>();

  constructor() {
    // Descarga previa: se dispara cada vez que cambia la lista de fotos.
    effect(() => this.precargar(this.fotos()));

    effect(() => {
      // Leer las señales aquí es lo que hace que el efecto se repita cuando
      // cambian las fotos, cuando se pausa o cuando termina la descarga.
      const total = this.fotos().length;
      const pausado = this.pausado();
      const listo = this.listo();

      this.detener();
      if (listo && total > 1 && !pausado) {
        this.temporizador = setInterval(() => this.avanzar(), this.intervalo());
      }
    });
  }

  ngOnDestroy(): void {
    this.detener();
    if (this.limpiezaSaliente) clearTimeout(this.limpiezaSaliente);
  }

  // ── Mosaico ────────────────────────────────────────────────────────────────

  fotoActual = computed(() => this.fotos()[this.indice()] ?? '');

  /** El mosaico solo existe mientras dura la transición de un efecto troceado. */
  hayMosaico = computed(() => this.saliente() !== null && !!MOSAICOS[this.efecto()]);

  /**
   * Celdas del mosaico.
   *
   * Cada una enseña su trozo de la foto: la imagen se agranda tantas veces como
   * columnas y filas tenga la rejilla, y luego se desplaza para que a cada celda
   * le toque el pedazo que le corresponde.
   */
  celdas = computed<Celda[]>(() => {
    const rejilla = MOSAICOS[this.efecto()];
    if (!rejilla) return [];

    const { columnas, filas, paso } = rejilla;
    const total = columnas * filas;
    const celdas: Celda[] = [];

    for (let i = 0; i < total; i++) {
      const columna = i % columnas;
      const fila = Math.floor(i / columnas);

      celdas.push({
        posicion: `${columnas > 1 ? (columna * 100) / (columnas - 1) : 0}% ${
          filas > 1 ? (fila * 100) / (filas - 1) : 0
        }%`,
        tamano: `${columnas * 100}% ${filas * 100}%`,
        // El salto de 37 posiciones reparte las celdas de forma desordenada sin
        // usar Math.random: un computed tiene que dar siempre el mismo resultado
        // para las mismas entradas, y con azar de verdad parpadearía en cada
        // recálculo. En las persianas manda la columna, para que caigan en orden.
        retardo: filas === 1 ? columna * paso : ((i * 37) % total) * paso,
      });
    }

    return celdas;
  });

  // ── Descarga previa ────────────────────────────────────────────────────────

  private precargar(urls: string[]): void {
    if (urls.length === 0) {
      this.listo.set(true);
      return;
    }

    const necesarias = Math.min(FOTOS_MINIMAS_PRECARGADAS, urls.length);
    let completadas = 0;

    const contar = () => {
      completadas++;
      if (completadas >= necesarias) this.listo.set(true);
    };

    for (const url of urls) {
      if (this.precargadas.has(url)) {
        contar();
        continue;
      }
      const imagen = new Image();
      // Un error de carga también cuenta: si una foto no existe, el carrusel no
      // puede quedarse esperándola para siempre.
      imagen.onload = () => {
        this.precargadas.add(url);
        contar();
      };
      imagen.onerror = contar;
      imagen.src = url;
    }
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  avanzar(): void {
    const total = this.fotos().length;
    if (total < 2) return;
    this.cambiarA((this.indice() + 1) % total);
  }

  retroceder(): void {
    const total = this.fotos().length;
    if (total < 2) return;
    this.cambiarA((this.indice() - 1 + total) % total);
  }

  irA(posicion: number): void {
    if (posicion === this.indice()) return;
    this.cambiarA(posicion);
    // Se reinicia la cuenta: si alguien acaba de elegir una foto, lo lógico es
    // que la vea el tiempo completo y no el resto del intervalo anterior.
    this.reiniciar();
  }

  siguienteManual(): void {
    this.avanzar();
    this.reiniciar();
  }

  anteriorManual(): void {
    this.retroceder();
    this.reiniciar();
  }

  /** Marca la foto actual como saliente, sortea el efecto y pasa a la nueva. */
  private cambiarA(destino: number): void {
    this.saliente.set(this.indice());
    this.efecto.set(this.sortearEfecto());
    this.indice.set(destino);

    // La foto saliente se retira cuando su animación termina. Si no se quitara,
    // quedaría apilada bajo la visible y las siguientes transiciones se verían
    // sucias.
    if (this.limpiezaSaliente) clearTimeout(this.limpiezaSaliente);
    this.limpiezaSaliente = setTimeout(
      () => this.saliente.set(null),
      DURACION_TRANSICION,
    );
  }

  /**
   * Elige un efecto distinto del anterior.
   *
   * Con ocho efectos y sorteo libre, repetir el mismo dos veces seguidas pasaría
   * una de cada ocho veces, y esa repetición es justo lo que delata que hay un
   * sorteo detrás en vez de una secuencia pensada.
   */
  private sortearEfecto(): Efecto {
    const anterior = this.efecto();
    const candidatos = EFECTOS.filter((e) => e !== anterior);
    return candidatos[Math.floor(Math.random() * candidatos.length)];
  }

  // ── Temporizador ───────────────────────────────────────────────────────────

  pausar(): void {
    this.pausado.set(true);
  }

  reanudar(): void {
    this.pausado.set(false);
  }

  private reiniciar(): void {
    if (this.pausado() || this.fotos().length < 2) return;
    this.detener();
    this.temporizador = setInterval(() => this.avanzar(), this.intervalo());
  }

  private detener(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = undefined;
    }
  }
}
