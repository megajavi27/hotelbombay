import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import moment from 'moment';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Reserva } from '../reserva/reserva.entity';
import { Pago, EstadoPago } from '../pago/pago.entity';
import { Cliente } from '../cliente/cliente.entity';
import { Empleado } from '../empleado/empleado.entity';
import { RecomendacionIa } from '../recomendacion-ia/recomendacion-ia.entity';

/** Cantidad de meses hacia atrás que se incluyen en las series mensuales del dashboard. */
const MESES_HISTORICOS = 6;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Habitacion)
    private readonly habitacionRepository: Repository<Habitacion>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(RecomendacionIa)
    private readonly recomendacionRepository: Repository<RecomendacionIa>,
  ) {}

  async getStats() {
    const [habitaciones, reservas, pagos, tiposHabitacionTop, totales] = await Promise.all([
      this.statsHabitaciones(),
      this.statsReservas(),
      this.statsPagos(),
      this.topTiposHabitacion(),
      this.statsTotales(),
    ]);

    return { habitaciones, reservas, pagos, tiposHabitacionTop, totales };
  }

  private async statsHabitaciones() {
    const habitaciones = await this.habitacionRepository.find({ relations: { tipoHabitacion: true } });
    const total = habitaciones.length;

    const porEstado: Record<string, number> = {};
    for (const h of habitaciones) {
      porEstado[h.estado] = (porEstado[h.estado] ?? 0) + 1;
    }

    const porTipoMap = new Map<string, number>();
    for (const h of habitaciones) {
      const nombre = h.tipoHabitacion?.nombre ?? 'Sin tipo';
      porTipoMap.set(nombre, (porTipoMap.get(nombre) ?? 0) + 1);
    }
    const porTipo = Array.from(porTipoMap.entries()).map(([nombre, total]) => ({ nombre, total }));

    return { total, porEstado, porTipo };
  }

  private async statsReservas() {
    const reservas = await this.reservaRepository.find();
    const total = reservas.length;

    const porEstado: Record<string, number> = {};
    for (const r of reservas) {
      porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;
    }

    const porMes = this.agruparPorMes(reservas, 'fecha_inicio');

    return { total, porEstado, porMes };
  }

  private async statsPagos() {
    const pagos = await this.pagoRepository.find();

    const totalIngresos = pagos
      .filter((p) => p.estado === EstadoPago.COMPLETADO)
      .reduce((sum, p) => sum + Number(p.monto), 0);

    const porEstado: Record<string, number> = {};
    for (const p of pagos) {
      porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1;
    }

    const porMes = this.agruparPorMes(
      pagos.filter((p) => p.estado === EstadoPago.COMPLETADO),
      'fecha_pago',
      'monto',
    );

    return { totalIngresos, porEstado, porMes };
  }

  private async topTiposHabitacion() {
    const reservas = await this.reservaRepository.find({ relations: { habitacion: { tipoHabitacion: true } } });
    const conteo = new Map<string, number>();
    for (const r of reservas) {
      const nombre = r.habitacion?.tipoHabitacion?.nombre ?? 'Sin tipo';
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    }
    return Array.from(conteo.entries())
      .map(([nombre, reservas]) => ({ nombre, reservas }))
      .sort((a, b) => b.reservas - a.reservas)
      .slice(0, 5);
  }

  private async statsTotales() {
    const [clientes, empleados, recomendacionesActivas] = await Promise.all([
      this.clienteRepository.count(),
      this.empleadoRepository.count({ where: { activo: true } }),
      this.recomendacionRepository.count({ where: { activo: true } }),
    ]);
    return { clientes, empleados, recomendacionesActivas };
  }

  /**
   * Agrupa registros por mes (YYYY-MM) de los últimos MESES_HISTORICOS meses usando moment,
   * sumando opcionalmente un campo numérico (si no se indica, cuenta registros).
   */
  private agruparPorMes(
    registros: Array<Record<string, any>>,
    campoFecha: string,
    campoSuma?: string,
  ): { mes: string; total: number }[] {
    const meses: string[] = [];
    for (let i = MESES_HISTORICOS - 1; i >= 0; i--) {
      meses.push(moment().subtract(i, 'months').format('YYYY-MM'));
    }

    const totales = new Map<string, number>(meses.map((mes) => [mes, 0]));

    for (const registro of registros) {
      const valor = registro[campoFecha];
      if (!valor) continue;
      const mes = moment(valor).format('YYYY-MM');
      if (!totales.has(mes)) continue;
      const incremento = campoSuma ? Number(registro[campoSuma]) : 1;
      totales.set(mes, (totales.get(mes) ?? 0) + incremento);
    }

    return meses.map((mes) => ({ mes, total: totales.get(mes) ?? 0 }));
  }
}
