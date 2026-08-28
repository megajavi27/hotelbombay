import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardService, DashboardStats } from '@services/dashboard.service';
import { NotificationService } from '@services/notification.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout';

const ESTADO_HABITACION_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  MANTENIMIENTO: 'Mantenimiento',
  LIMPIEZA: 'Limpieza'
};
const ESTADO_HABITACION_COLORS: Record<string, string> = {
  DISPONIBLE: '#16a34a',
  OCUPADA: '#2563eb',
  MANTENIMIENTO: '#f59e0b',
  LIMPIEZA: '#6b7280'
};
const ESTADO_RESERVA_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  CANCELADA: 'Cancelada'
};
const ESTADO_RESERVA_COLORS: Record<string, string> = {
  PENDIENTE: '#f59e0b',
  CONFIRMADA: '#2563eb',
  CHECKIN: '#16a34a',
  CHECKOUT: '#6b7280',
  CANCELADA: '#dc2626'
};

const SHARED_SCALES = {
  y: {
    beginAtZero: true,
    border: { display: false },
    grid: { color: 'rgba(0,0,0,0.05)' },
    ticks: {
      precision: 0,
      font: { family: 'Inter', size: 12 },
      color: '#64748b'
    }
  },
  x: {
    border: { display: false },
    grid: { display: false },
    ticks: {
      font: { family: 'Inter', size: 12 },
      color: '#64748b'
    }
  }
};

const SHARED_TOOLTIP = {
  backgroundColor: '#04162e',
  titleColor: '#fdd7a7',
  bodyColor: '#ffffff',
  borderColor: 'rgba(253,215,167,0.2)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  titleFont: { family: 'Inter', size: 13, weight: 'bold' as const },
  bodyFont: { family: 'Inter', size: 12 }
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatIconModule, MatProgressSpinnerModule, BaseChartDirective, PageLayoutComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  private service = inject(DashboardService);
  private notification = inject(NotificationService);

  isLoading = signal(true);
  stats = signal<DashboardStats | null>(null);

  habitacionesChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  reservasEstadoChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  ingresosMesChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  reservasMesChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  tiposTopChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: SHARED_TOOLTIP },
    scales: SHARED_SCALES
  };

  horizontalBarOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: SHARED_TOOLTIP },
    scales: {
      x: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { precision: 0, font: { family: 'Inter', size: 12 }, color: '#64748b' }
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 12 }, color: '#64748b' }
      }
    }
  };

  constructor() {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.service.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.buildCharts(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(err?.error?.message ?? 'No se pudieron cargar las estadísticas del dashboard.');
        this.isLoading.set(false);
      }
    });
  }

  private buildCharts(data: DashboardStats) {
    const estadosHab = Object.keys(data.habitaciones.porEstado);
    this.habitacionesChartData = {
      labels: estadosHab.map((e) => ESTADO_HABITACION_LABELS[e] ?? e),
      datasets: [{
        label: 'Habitaciones',
        data: estadosHab.map((e) => data.habitaciones.porEstado[e]),
        backgroundColor: estadosHab.map((e) => ESTADO_HABITACION_COLORS[e] ?? '#9ca3af'),
        borderRadius: 8,
        borderSkipped: false
      }]
    };

    const estadosRes = Object.keys(data.reservas.porEstado);
    this.reservasEstadoChartData = {
      labels: estadosRes.map((e) => ESTADO_RESERVA_LABELS[e] ?? e),
      datasets: [{
        label: 'Reservas',
        data: estadosRes.map((e) => data.reservas.porEstado[e]),
        backgroundColor: estadosRes.map((e) => ESTADO_RESERVA_COLORS[e] ?? '#9ca3af'),
        borderRadius: 8,
        borderSkipped: false
      }]
    };

    this.ingresosMesChartData = {
      labels: data.pagos.porMes.map((m) => m.mes),
      datasets: [{
        label: 'Ingresos ($)',
        data: data.pagos.porMes.map((m) => m.total),
        backgroundColor: '#755a34',
        borderRadius: 8,
        borderSkipped: false
      }]
    };

    this.reservasMesChartData = {
      labels: data.reservas.porMes.map((m) => m.mes),
      datasets: [{
        label: 'Reservas',
        data: data.reservas.porMes.map((m) => m.total),
        backgroundColor: '#04162e',
        borderRadius: 8,
        borderSkipped: false
      }]
    };

    this.tiposTopChartData = {
      labels: data.tiposHabitacionTop.map((t) => t.nombre),
      datasets: [{
        label: 'Reservas',
        data: data.tiposHabitacionTop.map((t) => t.reservas),
        backgroundColor: '#fdd7a7',
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  }
}
