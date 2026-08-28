import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { hashPassword } from '../../common/utils/hash.util';
import { formatEntityDates, formatEntityListDates } from '../../common/utils/date.util';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { Empleado } from './empleado.entity';
import { Usuario } from '../usuario/usuario.entity';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';

const FECHA_FIELDS = { date: ['fecha_contratacion'], datetime: ['fecha_creacion'] };

@Injectable()
export class EmpleadoService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PagedResult<Empleado>> {
    const { page = 1, limit = 10 } = pagination;
    const [empleados, total] = await this.empleadoRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.usuario', 'u')
      .leftJoinAndSelect('e.perfil', 'p')
      .where('u.visible = :visible', { visible: true })
      .orderBy('e.id_empleado', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data: formatEntityListDates(empleados, FECHA_FIELDS),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id_empleado: number): Promise<Empleado> {
    const empleado = await this.empleadoRepository.findOne({
      where: { id_empleado },
      relations: { usuario: true, perfil: true },
    });
    if (!empleado) {
      throw new NotFoundException(`No se encontró el empleado con id ${id_empleado}.`);
    }
    return formatEntityDates(empleado, FECHA_FIELDS);
  }

  async create(dto: CreateEmpleadoDto): Promise<Empleado> {
    // ── Caso A: vincular usuario existente ────────────────────────────────
    if (dto.id_usuario) {
      const usuario = await this.usuarioRepository.findOne({ where: { id_usuario: dto.id_usuario } });
      if (!usuario) {
        throw new NotFoundException('No se encontró el usuario con ese id.');
      }
      const yaEsEmpleado = await this.empleadoRepository.findOne({ where: { id_usuario: dto.id_usuario } });
      if (yaEsEmpleado) {
        throw new ConflictException('Esta persona ya está registrada como empleado.');
      }
      const empleado = this.empleadoRepository.create({
        id_usuario: dto.id_usuario,
        id_perfil: dto.id_perfil ?? null,
        fecha_contratacion: dto.fecha_contratacion,
        salario: dto.salario,
        activo: dto.activo ?? true,
      });
      const guardado = await this.empleadoRepository.save(empleado);
      return this.findOne(guardado.id_empleado);
    }

    // ── Caso B: persona nueva — validar y crear usuario + empleado ─────────
    if (!dto.email || !dto.password || !dto.nombre || !dto.apellido || !dto.numero_documento) {
      throw new BadRequestException('Para registrar un empleado nuevo debes proveer: email, password, nombre, apellido y numero_documento.');
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

      const empleado = manager.create(Empleado, {
        id_usuario: usuarioGuardado.id_usuario,
        id_perfil: dto.id_perfil ?? null,
        fecha_contratacion: dto.fecha_contratacion,
        salario: dto.salario,
        activo: dto.activo ?? true,
      });
      const empleadoGuardado = await manager.save(empleado);
      empleadoGuardado.usuario = usuarioGuardado;
      return formatEntityDates(empleadoGuardado, FECHA_FIELDS);
    });
  }

  async update(id_empleado: number, dto: UpdateEmpleadoDto): Promise<Empleado> {
    const empleado = await this.findOne(id_empleado);

    // Campos que van a la tabla usuario
    const usuarioFields: Partial<Usuario> = {};
    if (dto.nombre !== undefined) usuarioFields.nombre = dto.nombre;
    if (dto.apellido !== undefined) usuarioFields.apellido = dto.apellido;
    if (dto.tipo_documento !== undefined) usuarioFields.tipo_documento = dto.tipo_documento;
    if (dto.numero_documento !== undefined) {
      const existeDocumento = await this.usuarioRepository.findOne({
        where: { numero_documento: dto.numero_documento },
      });
      if (existeDocumento && existeDocumento.id_usuario !== empleado.id_usuario) {
        throw new ConflictException('Ya existe un usuario registrado con ese número de documento.');
      }
      usuarioFields.numero_documento = dto.numero_documento;
    }
    if (dto.telefono !== undefined) usuarioFields.telefono = dto.telefono;
    if (dto.direccion !== undefined) usuarioFields.direccion = dto.direccion;

    if (Object.keys(usuarioFields).length > 0) {
      await this.usuarioRepository.update({ id_usuario: empleado.id_usuario }, usuarioFields);
    }

    // Campos que van a la tabla empleado (activo vive aquí, no en usuario)
    if (dto.id_perfil !== undefined) empleado.id_perfil = dto.id_perfil ?? null;
    if (dto.fecha_contratacion !== undefined) empleado.fecha_contratacion = dto.fecha_contratacion;
    if (dto.salario !== undefined) empleado.salario = dto.salario;
    if (dto.activo !== undefined) empleado.activo = dto.activo;

    const guardado = await this.empleadoRepository.save(empleado);
    return this.findOne(guardado.id_empleado);
  }

  async remove(id_empleado: number): Promise<void> {
    const empleado = await this.findOne(id_empleado);
    await this.usuarioRepository.delete({ id_usuario: empleado.id_usuario });
  }
}
