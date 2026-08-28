import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { formatEntityDates, formatEntityListDates } from '../../common/utils/date.util';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FiltroPagoDto } from './dto/filtro-pago.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { Pago, EstadoPago, MetodoPago } from './pago.entity';
import { Reserva, EstadoReserva } from '../reserva/reserva.entity';
import { Usuario } from '../usuario/usuario.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { PagarReservaDto } from './dto/pagar-reserva.dto';
import { TransferenciaPagoDto, RechazarTransferenciaDto } from './dto/transferencia.dto';
import { MailService } from '../../common/services/mail.service';

const FECHA_FIELDS = { datetime: ['fecha_pago'] };

@Injectable()
export class PagoService {
  private readonly logger = new Logger(PagoService.name);

  constructor(
    @InjectRepository(Pago)
    private readonly repository: Repository<Pago>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filtro: FiltroPagoDto): Promise<PagedResult<Pago>> {
    const { page = 1, limit = 10, busqueda, estado } = filtro;

    // Asegurar que reservas activas sin pago tengan un registro PENDIENTE
    await this.crearPagosFaltantes();

    const qb = this.repository
      .createQueryBuilder('pago')
      .leftJoinAndSelect('pago.reserva', 'reserva')
      .leftJoinAndSelect('reserva.cliente', 'cliente')
      .leftJoinAndSelect('cliente.usuario', 'usuario')
      .leftJoinAndSelect('reserva.habitacion', 'habitacion')
      .orderBy('pago.id_pago', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (busqueda) {
      const term = `%${busqueda}%`;
      qb.andWhere(
        '(usuario.nombre LIKE :term OR usuario.apellido LIKE :term OR usuario.numero_documento LIKE :term OR usuario.email LIKE :term)',
        { term },
      );
    }

    if (estado) {
      qb.andWhere('pago.estado = :estado', { estado });
    }

    const [pagos, total] = await qb.getManyAndCount();

    return {
      data: formatEntityListDates(pagos, FECHA_FIELDS),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Crea pagos PENDIENTE para reservas activas que aún no tienen ningún pago */
  private async crearPagosFaltantes(): Promise<void> {
    const reservasSinPago = await this.reservaRepository
      .createQueryBuilder('r')
      .where('r.estado NOT IN (:...estados)', { estados: [EstadoReserva.CANCELADA, EstadoReserva.CHECKOUT] })
      .andWhere(qb => {
        const sub = qb.subQuery()
          .select('p.id_reserva')
          .from(Pago, 'p')
          .where('p.id_reserva = r.id_reserva')
          .getQuery();
        return `NOT EXISTS ${sub}`;
      })
      .getMany();

    if (reservasSinPago.length > 0) {
      const nuevos = reservasSinPago.map(r =>
        this.repository.create({
          id_reserva: r.id_reserva,
          monto:      r.total,
          estado:     EstadoPago.PENDIENTE,
        })
      );
      await this.repository.save(nuevos);
    }
  }

  async findOne(id_pago: number): Promise<Pago> {
    const pago = await this.repository.findOne({ where: { id_pago } });
    if (!pago) {
      throw new NotFoundException(`No se encontró el pago con id ${id_pago}.`);
    }
    return formatEntityDates(pago, FECHA_FIELDS);
  }

  async create(dto: CreatePagoDto): Promise<Pago> {
    const pago = this.repository.create(dto);
    const guardado = await this.repository.save(pago);
    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  async update(id_pago: number, dto: UpdatePagoDto): Promise<Pago> {
    const pago = await this.findOne(id_pago);
    Object.assign(pago, dto);
    const guardado = await this.repository.save(pago);
    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  async remove(id_pago: number): Promise<void> {
    const pago = await this.findOne(id_pago);
    await this.repository.remove(pago);
  }

  // ── PAGO DE RESERVA PROPIO DEL CLIENTE ────────────────────────────────────
  async pagarMiReserva(dto: PagarReservaDto, id_cliente: number): Promise<Pago & { codigo_comprobante: string }> {
    // Verificar reserva y pertenencia al cliente
    const reserva = await this.reservaRepository.findOne({
      where: { id_reserva: dto.id_reserva },
      relations: { habitacion: { tipoHabitacion: true }, cliente: { usuario: true } },
    });
    if (!reserva) throw new NotFoundException('No se encontró la reserva.');
    if (reserva.id_cliente !== id_cliente) throw new ForbiddenException('Esta reserva no te pertenece.');
    if (reserva.estado === EstadoReserva.CANCELADA) throw new BadRequestException('No se puede pagar una reserva cancelada.');

    // Verificar que no esté ya pagada
    const pagoCompletado = await this.repository.findOne({
      where: { id_reserva: dto.id_reserva, estado: EstadoPago.COMPLETADO },
    });
    if (pagoCompletado) throw new BadRequestException('Esta reserva ya tiene un pago completado.');

    // Generar código de comprobante único
    const codigo_comprobante = `HB-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Simular procesamiento (en producción aquí va el gateway)
    const referencia = `${codigo_comprobante} | *${dto.ultimos_4} | ${dto.cuotas}x`;

    // Buscar pago PENDIENTE existente (creado al registrar la reserva) o crear uno nuevo
    let pago = await this.repository.findOne({
      where: { id_reserva: dto.id_reserva, estado: EstadoPago.PENDIENTE },
    });
    if (pago) {
      pago.metodo_pago = MetodoPago.TARJETA_CREDITO;
      pago.estado      = EstadoPago.COMPLETADO;
      pago.referencia  = referencia;
      pago.monto       = reserva.total;
    } else {
      pago = this.repository.create({
        id_reserva:  dto.id_reserva,
        monto:       reserva.total,
        metodo_pago: MetodoPago.TARJETA_CREDITO,
        estado:      EstadoPago.COMPLETADO,
        referencia,
      });
    }
    // Guardar el pago y confirmar la reserva de forma atómica.
    const pagado = await this.dataSource.transaction(async (manager) => {
      const guardado = await manager.save(Pago, pago) as Pago;
      await manager.update(Reserva, dto.id_reserva, { estado: EstadoReserva.CONFIRMADA });
      return guardado;
    });

    // Notificar por email. Un fallo de correo no debe revertir ni reportarse como
    // error al cliente: el pago y la reserva ya quedaron confirmados exitosamente.
    const usuario = reserva.cliente?.usuario;
    try {
      await this.mailService.sendComprobantePago({
        email:             usuario?.email ?? 'cliente@hotelbombay.com',
        nombreCliente:     `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim(),
        codigoComprobante: codigo_comprobante,
        monto:             reserva.total,
        fechaPago:         new Date().toISOString(),
        habitacion:        `${reserva.habitacion?.numero ?? reserva.id_habitacion} — ${reserva.habitacion?.tipoHabitacion?.nombre ?? ''}`,
        fechaInicio:       reserva.fecha_inicio,
        fechaFin:          reserva.fecha_fin,
        ultimos4:          dto.ultimos_4,
        cuotas:            dto.cuotas,
      });
    } catch (error) {
      this.logger.error(`No se pudo enviar el comprobante de pago por email (reserva ${dto.id_reserva}).`, error as Error);
    }

    return { ...formatEntityDates(pagado, FECHA_FIELDS), codigo_comprobante };
  }

  // ── TRANSFERENCIA BANCARIA ─────────────────────────────────────────────────
  async registrarTransferencia(
    dto: TransferenciaPagoDto,
    id_cliente: number,
    comprobanteUrl: string,
  ): Promise<Pago> {
    const reserva = await this.reservaRepository.findOne({
      where: { id_reserva: dto.id_reserva },
      relations: { habitacion: { tipoHabitacion: true }, cliente: { usuario: true } },
    });
    if (!reserva) throw new NotFoundException('No se encontró la reserva.');
    if (reserva.id_cliente !== id_cliente) throw new ForbiddenException('Esta reserva no te pertenece.');
    if (reserva.estado === EstadoReserva.CANCELADA) throw new BadRequestException('No se puede pagar una reserva cancelada.');

    const pagoCompletado = await this.repository.findOne({
      where: { id_reserva: dto.id_reserva, estado: EstadoPago.COMPLETADO },
    });
    if (pagoCompletado) throw new BadRequestException('Esta reserva ya tiene un pago completado.');

    const pagoPendiente = await this.repository.findOne({
      where: { id_reserva: dto.id_reserva, estado: EstadoPago.PENDIENTE_REVISION },
    });
    if (pagoPendiente) throw new BadRequestException('Ya existe un comprobante en revisión para esta reserva. Espera la validación del hotel.');

    // Buscar pago PENDIENTE existente (creado al registrar la reserva) o crear uno nuevo
    let pago = await this.repository.findOne({
      where: { id_reserva: dto.id_reserva, estado: EstadoPago.PENDIENTE },
    });
    if (pago) {
      pago.metodo_pago     = MetodoPago.TRANSFERENCIA;
      pago.estado          = EstadoPago.PENDIENTE_REVISION;
      pago.referencia      = dto.referencia ?? undefined;
      pago.comprobante_url = comprobanteUrl;
      pago.monto           = reserva.total;
    } else {
      pago = this.repository.create({
        id_reserva:      dto.id_reserva,
        monto:           reserva.total,
        metodo_pago:     MetodoPago.TRANSFERENCIA,
        estado:          EstadoPago.PENDIENTE_REVISION,
        referencia:      dto.referencia ?? undefined,
        comprobante_url: comprobanteUrl,
      });
    }
    const guardado = await this.repository.save(pago) as Pago;
    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  // ── VALIDAR TRANSFERENCIA (empleado) ──────────────────────────────────────
  async validarTransferencia(id_pago: number): Promise<Pago> {
    const pago = await this.repository.findOne({
      where: { id_pago },
      relations: { reserva: { cliente: { usuario: true }, habitacion: { tipoHabitacion: true } } },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado.');
    if (pago.estado !== EstadoPago.PENDIENTE_REVISION)
      throw new BadRequestException('Este pago no está pendiente de revisión.');

    pago.estado = EstadoPago.COMPLETADO;

    const guardado = await this.dataSource.transaction(async (manager) => {
      const guardadoPago = await manager.save(Pago, pago);
      await manager.update(Reserva, pago.id_reserva, { estado: EstadoReserva.CONFIRMADA });
      return guardadoPago;
    });

    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  // ── RECHAZAR TRANSFERENCIA (empleado) ─────────────────────────────────────
  async rechazarTransferencia(id_pago: number, dto: RechazarTransferenciaDto): Promise<Pago> {
    const pago = await this.repository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado.');
    if (pago.estado !== EstadoPago.PENDIENTE_REVISION)
      throw new BadRequestException('Este pago no está pendiente de revisión.');

    pago.estado          = EstadoPago.RECHAZADO;
    pago.motivo_rechazo  = dto.motivo;
    const guardado = await this.repository.save(pago);
    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  // ── COBRAR EN EFECTIVO por id_pago (empleado) ────────────────────────────
  async cobrarEfectivo(id_pago: number): Promise<Pago> {
    const pago = await this.repository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado.');
    if (pago.estado !== EstadoPago.PENDIENTE)
      throw new BadRequestException('Solo se pueden cobrar pagos en estado PENDIENTE.');

    pago.metodo_pago = MetodoPago.EFECTIVO;
    pago.estado      = EstadoPago.COMPLETADO;

    const guardado = await this.dataSource.transaction(async (manager) => {
      const guardadoPago = await manager.save(Pago, pago) as Pago;
      await manager.update(Reserva, pago.id_reserva, { estado: EstadoReserva.CONFIRMADA });
      return guardadoPago;
    });

    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  // ── COBRAR EN EFECTIVO por id_reserva (desde lista de reservas) ───────────
  async cobrarEfectivoPorReserva(id_reserva: number): Promise<Pago> {
    // Verificar que no haya pago completado ya
    const pagado = await this.repository.findOne({
      where: { id_reserva, estado: EstadoPago.COMPLETADO },
    });
    if (pagado) throw new BadRequestException('Esta reserva ya tiene un pago completado.');

    // Buscar pago PENDIENTE existente o crear uno
    let pago = await this.repository.findOne({
      where: { id_reserva, estado: EstadoPago.PENDIENTE },
    });
    if (!pago) {
      const reserva = await this.reservaRepository.findOne({ where: { id_reserva } });
      if (!reserva) throw new NotFoundException('Reserva no encontrada.');
      if (reserva.estado === EstadoReserva.CANCELADA)
        throw new BadRequestException('No se puede pagar una reserva cancelada.');
      pago = this.repository.create({ id_reserva, monto: reserva.total, estado: EstadoPago.PENDIENTE });
    }

    pago.metodo_pago = MetodoPago.EFECTIVO;
    pago.estado      = EstadoPago.COMPLETADO;

    const guardado = await this.dataSource.transaction(async (manager) => {
      const guardadoPago = await manager.save(Pago, pago as Pago) as Pago;
      await manager.update(Reserva, id_reserva, { estado: EstadoReserva.CONFIRMADA });
      return guardadoPago;
    });

    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  // ── CANCELAR RESERVA: bloquear si hay pago pendiente de revisión ───────────
  async verificarSinPendiente(id_reserva: number): Promise<void> {
    const pagoPendiente = await this.repository.findOne({
      where: { id_reserva, estado: EstadoPago.PENDIENTE_REVISION },
    });
    if (pagoPendiente)
      throw new BadRequestException('No puedes cancelar la reserva mientras hay un comprobante en revisión. Espera la validación del hotel.');
  }
}
