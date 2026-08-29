import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import moment from 'moment';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Reserva, EstadoReserva } from '../reserva/reserva.entity';
import { Pago, EstadoPago } from '../pago/pago.entity';

/**
 * Estados que cuentan como una reserva efectivamente colocada.
 *
 * Una CHECKOUT ya ocurrió y una CHECKIN está ocurriendo: ambas son negocio real.
 * PENDIENTE todavía puede caerse y CANCELADA ya se cayó, así que ninguna de las
 * dos entra en los indicadores de ocupación ni de huéspedes atendidos.
 */
const ESTADOS_CONFIRMADOS = [
  EstadoReserva.CONFIRMADA,
  EstadoReserva.CHECKIN,
  EstadoReserva.CHECKOUT,
];

/** Cuántos clientes se muestran en el ranking del panel de clientes. */
const TOP_CLIENTES = 10;

/** Período sobre el que se calcula todo el panel. */
interface Rango {
  desde: Date;
  hasta: Date;
  /** Meses que abarca el período. Se usa para la media mensual de reservas. */
  meses: number;
  /** Días que abarca el período. Se usa para el índice de ocupación. */
  dias: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Habitacion)
    private readonly habitacionRepository: Repository<Habitacion>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
  ) {}

  /**
   * Devuelve todo lo que pintan las dos pestañas del dashboard, ya filtrado.
   *
   * El filtrado se hace aquí y no en el navegador a propósito: si el hotel
   * acumula miles de reservas, mandarlas todas al frontend para que descarte el
   * 90 % sería malgastar tiempo y memoria en ambos lados.
   */
  async getAnalitica(anio?: number, mes?: number) {
    const rango = await this.calcularRango(anio, mes);

    const [anios, kpis, general, clientes] = await Promise.all([
      this.aniosDisponibles(),
      this.calcularKpis(rango),
      this.seriesGenerales(rango),
      this.seriesClientes(rango),
    ]);

    return {
      filtros: {
        anios,
        anioSeleccionado: anio ?? null,
        mesSeleccionado: mes ?? null,
      },
      kpis,
      general,
      clientes,
    };
  }

  // ── Período ────────────────────────────────────────────────────────────────

  /**
   * Traduce los filtros de año y mes a un intervalo de fechas concreto.
   *
   * Sin año seleccionado el período es todo el histórico que exista en la base.
   * Se calcula a partir de las reservas reales y no de una constante, para que
   * la media mensual y el índice de ocupación se dividan entre el tiempo que el
   * hotel lleva operando y no entre un número inventado.
   */
  private async calcularRango(anio?: number, mes?: number): Promise<Rango> {
    if (anio && mes) {
      const base = moment({ year: anio, month: mes - 1, date: 1 });
      const desde = base.clone().startOf('month');
      const hasta = base.clone().endOf('month');
      return { desde: desde.toDate(), hasta: hasta.toDate(), meses: 1, dias: hasta.diff(desde, 'days') + 1 };
    }

    if (anio) {
      const base = moment({ year: anio, month: 0, date: 1 });
      const desde = base.clone().startOf('year');
      const hasta = base.clone().endOf('year');
      return { desde: desde.toDate(), hasta: hasta.toDate(), meses: 12, dias: hasta.diff(desde, 'days') + 1 };
    }

    const limites = await this.reservaRepository
      .createQueryBuilder('r')
      .select('MIN(r.fecha_inicio)', 'min')
      .addSelect('MAX(r.fecha_fin)', 'max')
      .getRawOne<{ min: string | null; max: string | null }>();

    const desde = limites?.min ? moment(limites.min).startOf('month') : moment().startOf('year');
    const hasta = limites?.max ? moment(limites.max).endOf('month') : moment().endOf('year');

    return {
      desde: desde.toDate(),
      hasta: hasta.toDate(),
      meses: Math.max(1, hasta.diff(desde, 'months') + 1),
      dias: Math.max(1, hasta.diff(desde, 'days') + 1),
    };
  }

  /** Años que tienen al menos una reserva, para llenar el desplegable del filtro. */
  private async aniosDisponibles(): Promise<number[]> {
    const filas = await this.reservaRepository
      .createQueryBuilder('r')
      .select('DISTINCT YEAR(r.fecha_inicio)', 'anio')
      .orderBy('anio', 'DESC')
      .getRawMany<{ anio: number }>();

    return filas.map((f) => Number(f.anio)).filter((a) => !Number.isNaN(a));
  }

  // ── Consultas base ─────────────────────────────────────────────────────────

  /** Reservas del período, en los estados que cuentan como negocio real. */
  private reservasConfirmadas(rango: Rango): SelectQueryBuilder<Reserva> {
    return this.reservaRepository
      .createQueryBuilder('r')
      .where('r.fecha_inicio BETWEEN :desde AND :hasta', rango)
      .andWhere('r.estado IN (:...estados)', { estados: ESTADOS_CONFIRMADOS });
  }

  /** Pagos cobrados dentro del período. */
  private pagosCompletados(rango: Rango): SelectQueryBuilder<Pago> {
    return this.pagoRepository
      .createQueryBuilder('p')
      .where('p.fecha_pago BETWEEN :desde AND :hasta', rango)
      .andWhere('p.estado = :estado', { estado: EstadoPago.COMPLETADO });
  }

  // ── Indicadores ────────────────────────────────────────────────────────────

  private async calcularKpis(rango: Rango) {
    const [resumenReservas, ingresos, totalHabitaciones] = await Promise.all([
      this.reservasConfirmadas(rango)
        .select('COUNT(*)', 'reservas')
        .addSelect('COALESCE(SUM(r.numero_huespedes), 0)', 'huespedes')
        .addSelect('COALESCE(SUM(DATEDIFF(r.fecha_fin, r.fecha_inicio)), 0)', 'noches')
        .getRawOne<{ reservas: string; huespedes: string; noches: string }>(),
      this.pagosCompletados(rango)
        .select('COALESCE(SUM(p.monto), 0)', 'total')
        .getRawOne<{ total: string }>(),
      this.habitacionRepository.count(),
    ]);

    const reservas  = Number(resumenReservas?.reservas ?? 0);
    const huespedes = Number(resumenReservas?.huespedes ?? 0);
    const noches    = Number(resumenReservas?.noches ?? 0);

    // Noches disponibles = habitaciones del hotel × días del período. Si todavía
    // no hay habitaciones cargadas el índice sería una división por cero.
    const nochesDisponibles = totalHabitaciones * rango.dias;

    return {
      reservasConfirmadas: reservas,
      ingresos:            Number(ingresos?.total ?? 0),
      huespedes,
      mediaReservasMes:    reservas / rango.meses,
      estanciaMedia:       reservas > 0 ? noches / reservas : 0,
      indiceOcupacion:     nochesDisponibles > 0 ? (noches / nochesDisponibles) * 100 : 0,
      desde:               moment(rango.desde).format('YYYY-MM-DD'),
      hasta:               moment(rango.hasta).format('YYYY-MM-DD'),
    };
  }

  // ── Pestaña general ────────────────────────────────────────────────────────

  private async seriesGenerales(rango: Rango) {
    const [reservasPorMes, ingresosPorMes, reservasPorTipo, ingresoPorTipo, ingresosPorMetodo, reservasPorEstado] =
      await Promise.all([
        this.reservasConfirmadas(rango)
          .select('MONTH(r.fecha_inicio)', 'mes')
          .addSelect('COUNT(*)', 'total')
          .groupBy('mes')
          .orderBy('mes', 'ASC')
          .getRawMany<{ mes: number; total: string }>(),

        this.pagosCompletados(rango)
          .select('MONTH(p.fecha_pago)', 'mes')
          .addSelect('SUM(p.monto)', 'total')
          .groupBy('mes')
          .orderBy('mes', 'ASC')
          .getRawMany<{ mes: number; total: string }>(),

        this.reservasConfirmadas(rango)
          .innerJoin('r.habitacion', 'h')
          .innerJoin('h.tipoHabitacion', 't')
          .select('t.nombre', 'nombre')
          .addSelect('COUNT(*)', 'total')
          .groupBy('t.nombre')
          .orderBy('total', 'DESC')
          .getRawMany<{ nombre: string; total: string }>(),

        this.pagosCompletados(rango)
          .innerJoin('p.reserva', 'r')
          .innerJoin('r.habitacion', 'h')
          .innerJoin('h.tipoHabitacion', 't')
          .select('t.nombre', 'nombre')
          .addSelect('SUM(p.monto)', 'total')
          .groupBy('t.nombre')
          .orderBy('total', 'DESC')
          .getRawMany<{ nombre: string; total: string }>(),

        this.pagosCompletados(rango)
          .select('COALESCE(p.metodo_pago, \'SIN MÉTODO\')', 'metodo')
          .addSelect('SUM(p.monto)', 'total')
          .groupBy('metodo')
          .orderBy('total', 'DESC')
          .getRawMany<{ metodo: string; total: string }>(),

        // El desglose por estado sí incluye pendientes y canceladas: justamente
        // sirve para ver cuánto se está cayendo.
        this.reservaRepository
          .createQueryBuilder('r')
          .where('r.fecha_inicio BETWEEN :desde AND :hasta', rango)
          .select('r.estado', 'estado')
          .addSelect('COUNT(*)', 'total')
          .groupBy('r.estado')
          .getRawMany<{ estado: string; total: string }>(),
      ]);

    return {
      // Las series mensuales se rellenan con los 12 meses aunque algunos vengan
      // vacíos: un gráfico al que le faltan meses miente sobre la estacionalidad.
      reservasPorMes: this.completarMeses(reservasPorMes),
      ingresosPorMes: this.completarMeses(ingresosPorMes),
      reservasPorTipo:   this.aNumeros(reservasPorTipo, 'nombre'),
      ingresoPorTipo:    this.aNumeros(ingresoPorTipo, 'nombre'),
      ingresosPorMetodo: this.aNumeros(ingresosPorMetodo, 'metodo'),
      reservasPorEstado: this.aNumeros(reservasPorEstado, 'estado'),
    };
  }

  // ── Pestaña de clientes ────────────────────────────────────────────────────

  private async seriesClientes(rango: Rango) {
    const [porNacionalidad, top] = await Promise.all([
      this.reservasConfirmadas(rango)
        .innerJoin('r.cliente', 'c')
        .select('COALESCE(NULLIF(c.nacionalidad, \'\'), \'Sin registrar\')', 'nacionalidad')
        .addSelect('COUNT(*)', 'total')
        .groupBy('nacionalidad')
        .orderBy('total', 'DESC')
        .getRawMany<{ nacionalidad: string; total: string }>(),

      this.reservasConfirmadas(rango)
        .innerJoin('r.cliente', 'c')
        .innerJoin('c.usuario', 'u')
        .select('u.numero_documento', 'documento')
        .addSelect("CONCAT(u.nombre, ' ', u.apellido)", 'nombre')
        .addSelect('COUNT(*)', 'total')
        .groupBy('u.id_usuario')
        .orderBy('total', 'DESC')
        .limit(TOP_CLIENTES)
        .getRawMany<{ documento: string; nombre: string; total: string }>(),
    ]);

    return {
      reservasPorNacionalidad: this.aNumeros(porNacionalidad, 'nacionalidad'),
      topClientes: top.map((c) => ({
        documento: c.documento,
        nombre:    c.nombre,
        total:     Number(c.total),
      })),
    };
  }

  // ── Utilidades ─────────────────────────────────────────────────────────────

  /**
   * MySQL devuelve los agregados como texto (SUM sobre DECIMAL sale string).
   * Sin esta conversión el frontend recibiría "9777.00" y Chart.js dibujaría
   * barras de altura cero.
   */
  private aNumeros<T extends Record<string, any>>(filas: T[], clave: keyof T) {
    return filas.map((fila) => ({
      etiqueta: String(fila[clave]),
      total:    Number(fila['total']),
    }));
  }

  /** Rellena con cero los meses sin datos, de enero a diciembre. */
  private completarMeses(filas: { mes: number; total: string }[]) {
    const porMes = new Map(filas.map((f) => [Number(f.mes), Number(f.total)]));
    return Array.from({ length: 12 }, (_, i) => ({
      mes:   i + 1,
      total: porMes.get(i + 1) ?? 0,
    }));
  }
}
