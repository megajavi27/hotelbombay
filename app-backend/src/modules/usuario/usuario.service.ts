import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../../common/utils/hash.util';
import { formatEntityDates, formatEntityListDates } from '../../common/utils/date.util';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { Usuario, TipoDocumento } from './usuario.entity';
import { Empleado } from '../empleado/empleado.entity';
import { Cliente } from '../cliente/cliente.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { BusquedaDocumentoResultDto } from './dto/busqueda-documento.dto';

const FECHA_FIELDS = { datetime: ['fecha_creacion', 'fecha_actualizacion'] };

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PagedResult<Usuario>> {
    const { page = 1, limit = 10 } = pagination;
    const [usuarios, total] = await this.usuarioRepository.findAndCount({
      where: { visible: true },
      order: { id_usuario: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: formatEntityListDates(usuarios, FECHA_FIELDS),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id_usuario: number): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({ where: { id_usuario } });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario con id ${id_usuario}.`);
    }
    return formatEntityDates(usuario, FECHA_FIELDS);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { email } });
  }

  /**
   * Busca un usuario por tipo y número de documento.
   * Devuelve los datos del usuario junto con flags esEmpleado / esCliente.
   * Devuelve null si no existe.
   */
  async buscarPorDocumento(
    tipo_documento: TipoDocumento,
    numero_documento: string,
  ): Promise<BusquedaDocumentoResultDto | null> {
    const usuario = await this.usuarioRepository.findOne({
      where: { tipo_documento, numero_documento },
    });
    if (!usuario) return null;

    const [empleado, cliente] = await Promise.all([
      this.empleadoRepository.findOne({ where: { id_usuario: usuario.id_usuario } }),
      this.clienteRepository.findOne({ where: { id_usuario: usuario.id_usuario } }),
    ]);

    return {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      tipo_documento: usuario.tipo_documento,
      numero_documento: usuario.numero_documento,
      telefono: usuario.telefono,
      direccion: usuario.direccion,
      esEmpleado: !!empleado,
      esCliente: !!cliente,
    };
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existeEmail = await this.findByEmail(dto.email);
    if (existeEmail) {
      throw new ConflictException('Ya existe un usuario registrado con ese correo electrónico.');
    }
    const existeDocumento = await this.usuarioRepository.findOne({
      where: { numero_documento: dto.numero_documento },
    });
    if (existeDocumento) {
      throw new ConflictException('Ya existe un usuario registrado con ese número de documento.');
    }
    const password = hashPassword(dto.password);
    const usuario = this.usuarioRepository.create({ ...dto, password });
    const guardado = await this.usuarioRepository.save(usuario);
    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  async update(id_usuario: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id_usuario);
    if (dto.email && dto.email !== usuario.email) {
      const existente = await this.findByEmail(dto.email);
      if (existente) {
        throw new ConflictException('Ya existe un usuario registrado con ese correo electrónico.');
      }
    }
    if (dto.numero_documento && dto.numero_documento !== usuario.numero_documento) {
      const existente = await this.usuarioRepository.findOne({
        where: { numero_documento: dto.numero_documento },
      });
      if (existente) {
        throw new ConflictException('Ya existe un usuario registrado con ese número de documento.');
      }
    }
    const data: Partial<Usuario> = { ...dto };
    if (dto.password) {
      data.password = hashPassword(dto.password);
    } else {
      delete data.password;
    }
    Object.assign(usuario, data);
    const guardado = await this.usuarioRepository.save(usuario);
    return formatEntityDates(guardado, FECHA_FIELDS);
  }

  async remove(id_usuario: number): Promise<void> {
    const usuario = await this.findOne(id_usuario);
    await this.usuarioRepository.remove(usuario);
  }
}
