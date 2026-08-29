import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardService, AnaliticaDashboard, PuntoCategoria } from '@services/dashboard.service';
import { NotificationService } from '@services/notification.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';

/**
 * Paleta de los gráficos.
 *
 * Los dos tonos de serie son versiones aclaradas del azul y del bronce de la
 * marca: el #04162e original es tan oscuro que sobre blanco todas las barras se
 * verían como un bloque negro y el color dejaría de comunicar nada. Estos dos
 * conservan el matiz de la marca y además superan los umbrales de contraste y
 * de separación para daltonismo (protanopía y deuteranopía).
 *
 * Regla aplicada en todo el panel: el AZUL cuenta reservas y el BRONCE cuenta
 * dinero. Al ser siempre la misma correspondencia, el color se lee sin leyenda.
 */
const COLOR_RESERVAS = '#265f9c';
const COLOR_INGRESOS = '#a1732f';

/**
 * Los estados sí llevan un color por categoría, porque en la dona todos los
 * segmentos se tocan y hay que distinguirlos. El orden es el del ciclo de vida
 * de una reserva, y los tonos siguen el significado: ámbar lo que está en
 * espera, azul lo confirmado, verde lo que está ocurriendo, violeta lo cerrado
 * y rojo lo perdido.
 */
const ESTADOS: { clave: string; etiqueta: string; color: string }[] = [
  { clave: 'PENDIENTE',  etiqueta: 'Pendiente',  color: '#eda100' },
  { clave: 'CONFIRMADA', etiqueta: 'Confirmada', color: '#265f9c' },
  { clave: 'CHECKIN',    etiqueta: 'Check-in',   color: '#1baf7a' },
  { clave: 'CHECKOUT',   etiqueta: 'Check-out',  color: '#4a3aa7' },
  { clave: 'CANCELADA',  etiqueta: 'Cancelada',  color: '#e34948' },
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const MESES_FILTRO = MESES_CORTOS.map((nombre, i) => ({ valor: i + 1, nombre }));

const TIPOGRAFIA = { family: 'Inter', size: 12 };
const TINTA_SUAVE = '#44474d';

/** Rejilla discreta: guía la lectura sin competir con los datos. */
const EJE_VALOR = {
  beginAtZero: true,
  border: { display: false },
  grid: { color: 'rgba(4,22,46,0.06)' },
  ticks: { font: TIPOGRAFIA, color: TINTA_SUAVE },
};

const EJE_CATEGORIA = {
  border: { display: false },
  grid: { display: false },
  ticks: { font: TIPOGRAFIA, color: TINTA_SUAVE },
};

const TOOLTIP = {
  backgroundColor: '#04162e',
  titleColor: '#fdd7a7',
  bodyColor: '#ffffff',
  borderColor: 'rgba(253,215,167,0.25)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
  titleFont: { family: 'Inter', size: 13, weight: 'bold' as const },
  bodyFont: TIPOGRAFIA,
};

/** Entrada de la leyenda de la dona: color, nombre, valor y porcentaje. */
interface LeyendaEstado {
  etiqueta: string;
  color: string;
  total: number;
  porcentaje: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    PageLayoutComponent,
  ],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {
  private service = inject(DashboardService);
  private notification = inject(NotificationService);

  readonly MESES = MESES_FILTRO;

  isLoading = signal(true);
  datos = signal<AnaliticaDashboard | null>(null);
  anios = signal<number[]>([]);

  /** null = todos los años / todos los meses. */
  anio: number | null = null;
  mes: number | null = null;

  // ── Series de la pestaña general ───────────────────────────────────────────
  reservasPorMes: ChartData<'bar'>  = { labels: [], datasets: [] };
  ingresosPorMes: ChartData<'line'> = { labels: [], datasets: [] };
  ingresoPorTipo: ChartData<'bar'>  = { labels: [], datasets: [] };
  reservasPorTipo: ChartData<'bar'> = { labels: [], datasets: [] };
  ingresosPorMetodo: ChartData<'bar'> = { labels: [], datasets: [] };
  reservasPorEstado: ChartData<'doughnut'> = { labels: [], datasets: [] };
  leyendaEstados = signal<LeyendaEstado[]>([]);

  // ── Series de la pestaña de clientes ───────────────────────────────────────
  porNacionalidad: ChartData<'bar'> = { labels: [], datasets: [] };
  topClientes: ChartData<'bar'> = { labels: [], datasets: [] };

  // ── Configuraciones ────────────────────────────────────────────────────────

  opcionesColumnas: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: TOOLTIP },
    scales: { y: EJE_VALOR, x: EJE_CATEGORIA },
  };

  opcionesBarras: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: TOOLTIP },
    scales: { x: EJE_VALOR, y: EJE_CATEGORIA },
  };

  opcionesLinea: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...TOOLTIP, mode: 'index', intersect: false } },
    // El cursor engancha el punto más cercano en el eje X: en una serie temporal
    // no hay que acertarle al punto exacto para ver el valor del mes.
    interaction: { mode: 'index', intersect: false },
    scales: { y: EJE_VALOR, x: EJE_CATEGORIA },
  };

  opcionesDona: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    // La leyenda se dibuja en HTML al lado, con el valor y el porcentaje de cada
    // estado: así la identidad no depende solo del color.
    plugins: { legend: { display: false }, tooltip: TOOLTIP },
  };

  constructor() {
    this.cargar();
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  cargar() {
    this.isLoading.set(true);
    this.service.getAnalitica(this.anio, this.mes).subscribe({
      next: (data) => {
        this.datos.set(data);
        this.anios.set(data.filtros.anios);
        this.construirGraficos(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar los indicadores.');
        this.isLoading.set(false);
      },
    });
  }

  /** Sin año no tiene sentido filtrar por mes: se limpia para no engañar. */
  onAnioChange() {
    if (!this.anio) this.mes = null;
    this.cargar();
  }

  // ── Construcción de los gráficos ───────────────────────────────────────────

  private construirGraficos(data: AnaliticaDashboard) {
    this.reservasPorMes = {
      labels: MESES_CORTOS,
      datasets: [this.columnas(data.general.reservasPorMes.map((m) => m.total), COLOR_RESERVAS, 'Reservas')],
    };

    this.ingresosPorMes = {
      labels: MESES_CORTOS,
      datasets: [{
        label: 'Ingresos',
        data: data.general.ingresosPorMes.map((m) => m.total),
        borderColor: COLOR_INGRESOS,
        backgroundColor: COLOR_INGRESOS,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: COLOR_INGRESOS,
        // Anillo del color de la superficie: separa el punto de la línea cuando
        // dos quedan pegados.
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false,
      }],
    };

    this.ingresoPorTipo    = this.deCategorias(data.general.ingresoPorTipo, COLOR_INGRESOS, 'Ingresos');
    this.reservasPorTipo   = this.deCategorias(data.general.reservasPorTipo, COLOR_RESERVAS, 'Reservas');
    this.ingresosPorMetodo = this.deCategorias(data.general.ingresosPorMetodo, COLOR_INGRESOS, 'Ingresos');
    this.porNacionalidad   = this.deCategorias(data.clientes.reservasPorNacionalidad, COLOR_RESERVAS, 'Reservas');

    this.topClientes = {
      labels: data.clientes.topClientes.map((c) => c.nombre || c.documento),
      datasets: [this.columnas(data.clientes.topClientes.map((c) => c.total), COLOR_RESERVAS, 'Reservas')],
    };

    this.construirDona(data.general.reservasPorEstado);
  }

  /**
   * La dona respeta el orden del ciclo de vida (pendiente → cancelada) en vez
   * del orden en que MySQL devolvió las filas, para que el color de cada estado
   * no cambie de sitio al cambiar el filtro.
   */
  private construirDona(porEstado: PuntoCategoria[]) {
    const valores = new Map(porEstado.map((p) => [p.etiqueta, p.total]));
    const presentes = ESTADOS.filter((e) => (valores.get(e.clave) ?? 0) > 0);
    const total = presentes.reduce((suma, e) => suma + (valores.get(e.clave) ?? 0), 0);

    this.reservasPorEstado = {
      labels: presentes.map((e) => e.etiqueta),
      datasets: [{
        data: presentes.map((e) => valores.get(e.clave) ?? 0),
        backgroundColor: presentes.map((e) => e.color),
        // 2px del color de la superficie entre segmentos: sin esa separación dos
        // colores contiguos se leen como uno solo.
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    };

    this.leyendaEstados.set(
      presentes.map((e) => {
        const valor = valores.get(e.clave) ?? 0;
        return {
          etiqueta: e.etiqueta,
          color: e.color,
          total: valor,
          porcentaje: total > 0 ? (valor / total) * 100 : 0,
        };
      }),
    );
  }

  private deCategorias(puntos: PuntoCategoria[], color: string, etiqueta: string): ChartData<'bar'> {
    return {
      labels: puntos.map((p) => p.etiqueta),
      datasets: [this.columnas(puntos.map((p) => p.total), color, etiqueta)],
    };
  }

  /** Barra fina, con la punta redondeada y la base anclada en el cero. */
  private columnas(data: number[], color: string, label: string) {
    return {
      label,
      data,
      backgroundColor: color,
      hoverBackgroundColor: color,
      borderRadius: 4,
      borderSkipped: false as const,
      maxBarThickness: 34,
    };
  }

  // ── Ayudas para la plantilla ───────────────────────────────────────────────

  get tituloPeriodo(): string {
    if (!this.anio) return 'Todo el histórico';
    if (!this.mes) return `Año ${this.anio}`;
    return `${MESES_CORTOS[this.mes - 1]} ${this.anio}`;
  }

  /**
   * Se tipa por estructura y no como `ChartData<...>` para que sirva igual con
   * barras, líneas y donas sin pelearse con los genéricos de Chart.js.
   */
  hayDatos(chart: { datasets: { data: unknown[] }[] }): boolean {
    const serie = chart.datasets?.[0]?.data as (number | null)[] | undefined;
    return !!serie?.some((v) => (v ?? 0) > 0);
  }
}
