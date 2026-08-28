import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { diffInDays, formatEntityDates, formatEntityListDates, validarRangoFechasReserva } from '../../common/utils/date.util';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FiltroReservaDto } from './dto/filtro-reserva.dto';
import { FiltroMisReservasDto } from './dto/filtro-mis-reservas.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { Reserva, EstadoReserva } from './reserva.entity';
import { Habitacion, EstadoHabitacion } from '../habitacion/habitacion.entity';
import { Pago, EstadoPago, MetodoPago } from '../pago/pago.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

const FECHA_FIELDS = { date: ['fecha_inicio', 'fecha_fin'], datetime: ['fecha_creacion'] };

@Injectable()
export class ReservaService {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Habitacion)
    private readonly habitacionRepository: Repository<Habitacion>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filtro: FiltroReservaDto): Promise<PagedResult<Reserva>> {
    const { page = 1, limit = 10, busqueda, fecha_inicio, fecha_fin, estado } = filtro;

    const qb = this.reservaRepository.createQueryBuilder('r')
      .leftJoinAndSelect('r.habitacion', 'habitacion')
      .leftJoinAndSelect('habitacion.tipoHabitacion', 'tipoHabitacion')
      .leftJoinAndSelect('r.cliente', 'cliente')
      .leftJoinAndSelect('cliente.usuario', 'usuario')
      .orderBy('r.id_reserva', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (busqueda) {
      qb.andWhere(
        "(LOWER(usuario.nombre) LIKE :q OR LOWER(usuario.apellido) LIKE :q OR LOWER(usuario.numero_documento) LIKE :q OR CONCAT(LOWER(usuario.nombre), ' ', LOWER(usuario.apellido)) LIKE :q)",
        { q: `%${busqueda.toLowerCase()}%` }
      );
    }
    if (fecha_inicio) {
      qb.andWhere('r.fecha_inicio >= :fi', { fi: fecha_inicio });
    }
    if (fecha_fin) {
      qb.andWhere('r.fecha_fin <= :ff', { ff: fecha_fin });
    }
    if (estado) {
      qb.andWhere('r.estado = :estado', { estado });
    }

    const [reservas, total] = await qb.getManyAndCount();
    return {
      data: formatEntityListDates(reservas, FECHA_FIELDS),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCliente(id_cliente: number, filtro: FiltroMisReservasDto): Promise<PagedResult<any>> {
    const { page = 1, limit = 10, estado, fecha_inicio, fecha_fin } = filtro;

    const qb = this.reservaRepository.createQueryBuilder('r')
      .leftJoinAndSelect('r.habitacion', 'habitacion')
      .leftJoinAndSelect('habitacion.tipoHabitacion', 'tipoHabitacion')
      .where('r.id_cliente = :id_cliente', { id_cliente })
      .orderBy('r.id_reserva', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (estado) {
      qb.andWhere('r.estado = :estado', { estado });
    }
    if (fecha_inicio) {
      qb.andWhere('r.fecha_inicio >= :fi', { fi: fecha_inicio });
    }
    if (fecha_fin) {
      qb.andWhere('r.fecha_fin <= :ff', { ff: fecha_fin });
    }

    const [reservas, total] = await qb.getManyAndCount();

    // Adjuntar el pago más reciente de cada reserva (para mostrar estado al cliente)
    const ids = reservas.map(r => r.id_reserva);
    const pagos = ids.length
      ? await this.pagoRepository.find({ where: ids.map(id => ({ id_reserva: id })), order: { id_pago: 'DESC' } })
      : [];

    const pagoMap = new Map<number, Pago>();
    for (const pago of pagos) {
      if (!pagoMap.has(pago.id_reserva)) pagoMap.set(pago.id_reserva, pago);
    }

    const data = formatEntityListDates(reservas, FECHA_FIELDS).map((r: any) => ({
      ...r,
      pago: pagoMap.get(r.id_reserva) ?? null,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id_reserva: number, currentUser?: { tipo?: string; id_cliente?: number }): Promise<Reserva> {
    const reserva = await this.reservaRepository.findOne({
      where: { id_reserva },
      relations: { habitacion: { tipoHabitacion: true }, cliente: { usuario: true } },
    });
    if (!reserva) {
      throw new NotFoundException(`No se encontró la reserva con id ${id_reserva}.`);
    }
    // Si quien consulta es un cliente, solo puede ver sus propias reservas.
    if (currentUser?.tipo === 'cliente' && reserva.id_cliente !== currentUser.id_cliente) {
      throw new ForbiddenException('Esta reserva no te pertenece.');
    }
    return formatEntityDates(reserva, FECHA_FIELDS);
  }

  async create(dto: CreateReservaDto, idEmpleadoAutenticado?: number): Promise<Reserva> {
    if (!dto.id_cliente) {
      throw new BadRequestException('El campo id_cliente es obligatorio.');
    }
    validarRangoFechasReserva(dto.fecha_inicio, dto.fecha_fin);
    const noches = this.calcularNoches(dto.fecha_inicio, dto.fecha_fin);

    // Se hace todo (bloqueo de la habitación, verificación de disponibilidad,
    // creación de la reserva y su pago pendiente) dentro de una misma transacción
    // con lock pesimista sobre la habitación, para cerrar la ventana de condición
    // de carrera (TOCTOU) entre dos reservas concurrentes para la misma habitación.
    const guardada = await this.dataSource.transaction(async (manager) => {
      const habitacion = await manager.findOne(Habitacion, {
        where: { id_habitacion: dto.id_habitacion },
        relations: { tipoHabitacion: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!habitacion) {
        throw new NotFoundException(`No se encontró la habitación con id ${dto.id_habitacion}.`);
      }

      await this.verificarDisponibilidad(
        dto.id_habitacion, dto.fecha_inicio, dto.fecha_fin, undefined, manager, habitacion.id_tipos_habitacion,
      );

      const total = Number(habitacion.tipoHabitacion.precio_noche) * noches;
      const reserva = manager.create(Reserva, {
        ...dto,
        id_empleado: dto.id_empleado ?? idEmpleadoAutenticado,
        total,
      });
      const reservaGuardada = await manager.save(Reserva, reserva);

      const pagoPendiente = manager.create(Pago, {
        id_reserva: reservaGuardada.id_reserva,
        monto:      reservaGuardada.total,
        estado:     EstadoPago.PENDIENTE,
      });
      await manager.save(Pago, pagoPendiente);
      return reservaGuardada;
    });

    return formatEntityDates(guardada, FECHA_FIELDS);
  }

  async update(id_reserva: number, dto: UpdateReservaDto): Promise<Reserva> {
    const reserva = await this.findOne(id_reserva);
    // Detecta si las fechas realmente están cambiando a valores nuevos (no solo
    // reenviadas sin modificar, como hace el formulario de edición del panel admin).
    const fechasRealmenteCambian =
      (dto.fecha_inicio !== undefined && dto.fecha_inicio !== reserva.fecha_inicio) ||
      (dto.fecha_fin !== undefined && dto.fecha_fin !== reserva.fecha_fin);
    Object.assign(reserva, dto);
    if (dto.fecha_inicio || dto.fecha_fin || dto.id_habitacion) {
      if (dto.fecha_inicio || dto.fecha_fin) {
        // Si las fechas no cambiaron (se reenvió el mismo valor), no se exige que
        // sean futuras — permite seguir editando reservas históricas.
        validarRangoFechasReserva(reserva.fecha_inicio, reserva.fecha_fin, {
          permitirFechaPasada: !fechasRealmenteCambian,
        });
      }
      // Verificar disponibilidad excluyendo la reserva actual
      await this.verificarDisponibilidad(
        reserva.id_habitacion,
        reserva.fecha_inicio,
        reserva.fecha_fin,
        id_reserva,
      );
      const habitacion = await this.habitacionRepository.findOne({
        where: { id_habitacion: reserva.id_habitacion },
        relations: { tipoHabitacion: true },
      });
      if (habitacion) {
        const noches = this.calcularNoches(reserva.fecha_inicio, reserva.fecha_fin);
        reserva.total = Number(habitacion.tipoHabitacion.precio_noche) * noches;
      }
    }
    const guardada = await this.reservaRepository.save(reserva);
    return formatEntityDates(guardada, FECHA_FIELDS);
  }

  async remove(id_reserva: number): Promise<void> {
    const reserva = await this.findOne(id_reserva);
    await this.reservaRepository.remove(reserva);
  }

  // ── CANCELAR RESERVA PROPIA DEL CLIENTE ───────────────────────────────────
  async cancelarMiReserva(id_reserva: number, id_cliente: number): Promise<{ eliminada: boolean; mensaje: string }> {
    const reserva = await this.reservaRepository.findOne({ where: { id_reserva } });
    if (!reserva) throw new NotFoundException('No se encontró la reserva.');
    if (reserva.id_cliente !== id_cliente) throw new ForbiddenException('Esta reserva no te pertenece.');
    if (reserva.estado === EstadoReserva.CHECKIN || reserva.estado === EstadoReserva.CHECKOUT) {
      throw new BadRequestException('No se puede cancelar una reserva que ya tiene check-in o check-out.');
    }
    if (reserva.estado === EstadoReserva.CANCELADA) {
      throw new BadRequestException('La reserva ya está cancelada.');
    }

    // Bloquear si hay comprobante en revisión
    const pagoPendiente = await this.pagoRepository.findOne({
      where: { id_reserva, estado: EstadoPago.PENDIENTE_REVISION },
    });
    if (pagoPendiente)
      throw new BadRequestException('No puedes cancelar la reserva mientras hay un comprobante en revisión. Espera la validación del hotel.');

    // Verificar si tiene pago completado
    const pagado = await this.pagoRepository.findOne({
      where: { id_reserva, estado: EstadoPago.COMPLETADO },
    });

    if (pagado) {
      // Si ya pagó → solo cambiar estado a CANCELADA (queda en historial)
      await this.reservaRepository.update(id_reserva, { estado: EstadoReserva.CANCELADA });
      return { eliminada: false, mensaje: 'Reserva cancelada. El reembolso será procesado en 5-7 días hábiles.' };
    } else {
      // Si no ha pagado → eliminar del sistema
      await this.reservaRepository.remove(reserva);
      return { eliminada: true, mensaje: 'Reserva eliminada exitosamente.' };
    }
  }

  // ── CHECK-IN ──────────────────────────────────────────────────────────────
  async checkIn(id_reserva: number): Promise<Reserva> {
    const reserva = await this.reservaRepository.findOne({ where: { id_reserva } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada.');
    if (reserva.estado !== EstadoReserva.CONFIRMADA) {
      throw new BadRequestException(`Solo se puede hacer check-in a reservas CONFIRMADAS. Estado actual: ${reserva.estado}.`);
    }
    await this.reservaRepository.update(id_reserva, { estado: EstadoReserva.CHECKIN });
    await this.habitacionRepository.update(reserva.id_habitacion, { estado: EstadoHabitacion.OCUPADA });
    return this.findOne(id_reserva);
  }

  // ── CHECK-OUT ─────────────────────────────────────────────────────────────
  async checkOut(id_reserva: number): Promise<Reserva> {
    const reserva = await this.reservaRepository.findOne({ where: { id_reserva } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada.');
    if (reserva.estado !== EstadoReserva.CHECKIN) {
      throw new BadRequestException(`Solo se puede hacer check-out a reservas en CHECKIN. Estado actual: ${reserva.estado}.`);
    }
    await this.reservaRepository.update(id_reserva, { estado: EstadoReserva.CHECKOUT });
    await this.habitacionRepository.update(reserva.id_habitacion, { estado: EstadoHabitacion.DISPONIBLE });
    return this.findOne(id_reserva);
  }

  // ── VERIFICAR DISPONIBILIDAD (sin solapamiento de fechas) ─────────────────
  private async verificarDisponibilidad(
    id_habitacion: number,
    fecha_inicio: string,
    fecha_fin: string,
    excludeReservaId?: number,
    manager?: EntityManager,
    id_tipos_habitacion?: number,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Reserva) : this.reservaRepository;
    const qb = repo.createQueryBuilder('r')
      .where('r.id_habitacion = :id_habitacion', { id_habitacion })
      .andWhere('r.estado NOT IN (:...excluidos)', { excluidos: [EstadoReserva.CANCELADA, EstadoReserva.CHECKOUT] })
      .andWhere('r.fecha_inicio < :fecha_fin',   { fecha_fin })
      .andWhere('r.fecha_fin   > :fecha_inicio', { fecha_inicio });

    if (excludeReservaId) {
      qb.andWhere('r.id_reserva != :excludeReservaId', { excludeReservaId });
    }

    const conflicto = await qb.getOne();
    if (conflicto) {
      let sugerencia = '';
      if (id_tipos_habitacion) {
        const alternativas = await this.buscarHabitacionesAlternativas(
          id_tipos_habitacion, fecha_inicio, fecha_fin, id_habitacion, manager,
        );
        if (alternativas.length > 0) {
          sugerencia = ` Habitaciones disponibles del mismo tipo en esas fechas: ${alternativas.join(', ')}.`;
        }
      }
      throw new ConflictException(
        `La habitación no está disponible del ${fecha_inicio} al ${fecha_fin}. Ya existe la reserva #${conflicto.id_reserva} en ese período.${sugerencia}`
      );
    }
  }

  /** Busca hasta 3 habitaciones del mismo tipo, distintas a la solicitada, sin reservas que se crucen con el rango dado. */
  private async buscarHabitacionesAlternativas(
    id_tipos_habitacion: number,
    fecha_inicio: string,
    fecha_fin: string,
    excludeHabitacionId: number,
    manager?: EntityManager,
  ): Promise<string[]> {
    const habRepo = manager ? manager.getRepository(Habitacion) : this.habitacionRepository;
    const candidatas = await habRepo.find({
      where: { id_tipos_habitacion },
      order: { numero: 'ASC' },
    });

    const reservaRepo = manager ? manager.getRepository(Reserva) : this.reservaRepository;
    const disponibles: string[] = [];
    for (const hab of candidatas) {
      if (hab.id_habitacion === excludeHabitacionId) continue;
      if (hab.estado === EstadoHabitacion.MANTENIMIENTO) continue;
      const conflicto = await reservaRepo.createQueryBuilder('r')
        .where('r.id_habitacion = :id', { id: hab.id_habitacion })
        .andWhere('r.estado NOT IN (:...excluidos)', { excluidos: [EstadoReserva.CANCELADA, EstadoReserva.CHECKOUT] })
        .andWhere('r.fecha_inicio < :fecha_fin',   { fecha_fin })
        .andWhere('r.fecha_fin   > :fecha_inicio', { fecha_inicio })
        .getOne();
      if (!conflicto) disponibles.push(hab.numero);
      if (disponibles.length >= 3) break;
    }
    return disponibles;
  }

  private calcularNoches(fecha_inicio: string, fecha_fin: string): number {
    const noches = diffInDays(fecha_inicio, fecha_fin);
    if (noches <= 0) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }
    return noches;
  }
}
