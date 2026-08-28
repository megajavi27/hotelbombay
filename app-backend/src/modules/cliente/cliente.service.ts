import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { hashPassword } from '../../common/utils/hash.util';
import { formatEntityDates, formatEntityListDates } from '../../common/utils/date.util';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FiltroClienteDto } from './dto/filtro-cliente.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { Cliente } from './cliente.entity';
import { Usuario } from '../usuario/usuario.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

const FECHA_FIELDS = { date: ['fecha_nacimiento'], datetime: ['fecha_creacion'] };

@Injectable()
export class ClienteService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filtro: FiltroClienteDto): Promise<PagedResult<Cliente>> {
    const { page = 1, limit = 10, busqueda, activo } = filtro;

    const qb = this.clienteRepository.createQueryBuilder('c')
      .leftJoinAndSelect('c.usuario', 'usuario')
      .orderBy('c.id_cliente', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (busqueda) {
      const term = `%${busqueda.toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(usuario.nombre) LIKE :term OR LOWER(usuario.apellido) LIKE :term OR LOWER(usuario.numero_documento) LIKE :term OR LOWER(usuario.email) LIKE :term OR CONCAT(LOWER(usuario.nombre), ' ', LOWER(usuario.apellido)) LIKE :term)",
        { term },
      );
    }

    if (activo !== undefined) {
      qb.andWhere('c.activo = :activo', { activo });
    }

    const [clientes, total] = await qb.getManyAndCount();
    return {
      data: formatEntityListDates(clientes, FECHA_FIELDS),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id_cliente: number): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id_cliente },
      relations: { usuario: true },
    });
    if (!cliente) {
      throw new NotFoundException(`No se encontró el cliente con id ${id_cliente}.`);
    }
    return formatEntityDates(cliente, FECHA_FIELDS);
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    // ── Caso A: vincular usuario existente ────────────────────────────────
    if (dto.id_usuario) {
      const usuario = await this.usuarioRepository.findOne({ where: { id_usuario: dto.id_usuario } });
      if (!usuario) {
        throw new NotFoundException('No se encontró el usuario con ese id.');
      }
      const yaEsCliente = await this.clienteRepository.findOne({ where: { id_usuario: dto.id_usuario } });
      if (yaEsCliente) {
        throw new ConflictException('Esta persona ya está registrada como cliente.');
      }
      const cliente = this.clienteRepository.create({
        id_usuario: dto.id_usuario,
        nacionalidad: dto.nacionalidad,
        fecha_nacimiento: dto.fecha_nacimiento,
        activo: dto.activo ?? true,
      });
      const guardado = await this.clienteRepository.save(cliente);
      return this.findOne(guardado.id_cliente);
    }

    // ── Caso B: persona nueva — validar y crear usuario + cliente ──────────
    if (!dto.email || !dto.password || !dto.nombre || !dto.apellido || !dto.numero_documento) {
      throw new BadRequestException('Para registrar un cliente nuevo debes proveer: email, password, nombre, apellido y numero_documento.');
    }
    const existeEmail = await this.usuarioRepository.findOne({ where: { email: dto.email } });
    if (existeEmail) {
      throw new ConflictException('Ya existe una cuenta registrada con ese correo electrónico.');
    }
    const existeDocumento = await this.usuarioRepository.findOne({
      where: { numero_documento: dto.numero_documento },
    });
    if (existeDocumento) {
      throw new ConflictException('Ya existe un usuario registrado con ese número de documento.');
    }

    return this.dataSource.transaction(async (manager) => {
      const password = hashPassword(dto.password!);
      const usuario = manager.create(Usuario, {
        email: dto.email,
        password,
        nombre: dto.nombre,
        apellido: dto.apellido,
        tipo_documento: dto.tipo_documento,
        numero_documento: dto.numero_documento,
        telefono: dto.telefono,
        direccion: dto.direccion,
      });
      const usuarioGuardado = await manager.save(usuario);

      const cliente = manager.create(Cliente, {
        id_usuario: usuarioGuardado.id_usuario,
        nacionalidad: dto.nacionalidad,
        fecha_nacimiento: dto.fecha_nacimiento,
        activo: dto.activo ?? true,
      });
      const clienteGuardado = await manager.save(cliente);
      clienteGuardado.usuario = usuarioGuardado;
      return formatEntityDates(clienteGuardado, FECHA_FIELDS);
    });
  }

  async update(id_cliente: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id_cliente);

    // Campos que van a la tabla usuario
    const usuarioFields: Partial<Usuario> = {};
    if (dto.nombre !== undefined) usuarioFields.nombre = dto.nombre;
    if (dto.apellido !== undefined) usuarioFields.apellido = dto.apellido;
    if (dto.tipo_documento !== undefined) usuarioFields.tipo_documento = dto.tipo_documento;
    if (dto.numero_documento !== undefined) {
      // Verificar unicidad si cambia el documento
      const existeDocumento = await this.usuarioRepository.findOne({
        where: { numero_documento: dto.numero_documento },
      });
      if (existeDocumento && existeDocumento.id_usuario !== cliente.id_usuario) {
        throw new ConflictException('Ya existe un usuario registrado con ese número de documento.');
      }
      usuarioFields.numero_documento = dto.numero_documento;
    }
    if (dto.telefono !== undefined) usuarioFields.telefono = dto.telefono;
    if (dto.direccion !== undefined) usuarioFields.direccion = dto.direccion;

    if (Object.keys(usuarioFields).length > 0) {
      await this.usuarioRepository.update({ id_usuario: cliente.id_usuario }, usuarioFields);
    }

    // Campos que van a la tabla cliente
    if (dto.nacionalidad !== undefined) cliente.nacionalidad = dto.nacionalidad;
    if (dto.fecha_nacimiento !== undefined) cliente.fecha_nacimiento = dto.fecha_nacimiento;
    if (dto.activo !== undefined) cliente.activo = dto.activo;

    const guardado = await this.clienteRepository.save(cliente);
    return this.findOne(guardado.id_cliente);
  }

  async remove(id_cliente: number): Promise<void> {
    const cliente = await this.findOne(id_cliente);
    try {
      await this.usuarioRepository.delete({ id_usuario: cliente.id_usuario });
    } catch (error: any) {
      // Violación de FK (ej: reserva.id_cliente ON DELETE RESTRICT) → mensaje de negocio claro.
      if (error?.code === 'ER_ROW_IS_REFERENCED_2' || error?.errno === 1451) {
        throw new ConflictException(
          'No se puede eliminar este cliente porque tiene reservas asociadas. Cancela o reasigna sus reservas primero.',
        );
      }
      throw error;
    }
  }
}
