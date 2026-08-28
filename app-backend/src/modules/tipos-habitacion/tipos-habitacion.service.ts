import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { TiposHabitacion } from './tipos-habitacion.entity';
import { Habitacion } from '../habitacion/habitacion.entity';
import { HabitacionImagen } from '../habitacion/habitacion-imagen.entity';
import { CreateTiposHabitacionDto } from './dto/create-tipos-habitacion.dto';
import { UpdateTiposHabitacionDto } from './dto/update-tipos-habitacion.dto';

/** Fotos que como máximo se envían al catálogo público por cada tipo. */
const MAX_IMAGENES_PUBLICAS_POR_TIPO = 8;

/** Un tipo de habitación tal como lo ve un visitante, con fotos reales de sus habitaciones. */
export interface TipoHabitacionPublico extends TiposHabitacion {
  /** Rutas públicas de las fotos (/uploads/habitacion/...). Puede venir vacío. */
  imagenes: string[];
}

@Injectable()
export class TiposHabitacionService {
  constructor(
    @InjectRepository(TiposHabitacion)
    private readonly repository: Repository<TiposHabitacion>,
    @InjectRepository(Habitacion)
    private readonly habitacionRepository: Repository<Habitacion>,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PagedResult<TiposHabitacion>> {
    const { page = 1, limit = 10 } = pagination;
    const [data, total] = await this.repository.findAndCount({
      order: { id_tipos_habitacion: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Sin paginar — usado en selects de formularios */
  findAllRaw(): Promise<TiposHabitacion[]> {
    return this.repository.find({ order: { id_tipos_habitacion: 'ASC' } });
  }

  /**
   * Catálogo público (sin autenticación).
   *
   * Las fotos viven en las habitaciones, no en el tipo, así que aquí se reúnen
   * las de todas las habitaciones de cada tipo: primero la portada de cada
   * habitación y después el resto. Si un tipo no tiene ninguna habitación con
   * fotos, `imagenes` viene vacío y el frontend cae en `imagen_url`.
   */
  async findActivosPublico(): Promise<TipoHabitacionPublico[]> {
    const tipos = await this.repository.find({
      where: { activo: true },
      order: { precio_noche: 'ASC' },
    });
    if (tipos.length === 0) return [];

    const filas = await this.habitacionRepository
      .createQueryBuilder('h')
      .innerJoin(HabitacionImagen, 'img', 'img.id_habitacion = h.id_habitacion')
      .select('h.id_tipos_habitacion', 'id_tipos_habitacion')
      .addSelect('img.url', 'url')
      .where('h.id_tipos_habitacion IN (:...ids)', {
        ids: tipos.map((t) => t.id_tipos_habitacion),
      })
      .orderBy('img.es_portada', 'DESC')
      .addOrderBy('h.numero', 'ASC')
      .addOrderBy('img.orden', 'ASC')
      .getRawMany<{ id_tipos_habitacion: number; url: string }>();

    const porTipo = new Map<number, string[]>();
    for (const fila of filas) {
      const idTipo = Number(fila.id_tipos_habitacion);
      const lista = porTipo.get(idTipo) ?? [];
      if (lista.length < MAX_IMAGENES_PUBLICAS_POR_TIPO && !lista.includes(fila.url)) {
        lista.push(fila.url);
      }
      porTipo.set(idTipo, lista);
    }

    return tipos.map((tipo) => ({
      ...tipo,
      imagenes: porTipo.get(tipo.id_tipos_habitacion) ?? [],
    }));
  }

  async findOne(id_tipos_habitacion: number): Promise<TiposHabitacion> {
    const tipo = await this.repository.findOne({ where: { id_tipos_habitacion } });
    if (!tipo) {
      throw new NotFoundException(`No se encontró el tipo de habitación con id ${id_tipos_habitacion}.`);
    }
    return tipo;
  }

  create(dto: CreateTiposHabitacionDto): Promise<TiposHabitacion> {
    const tipo = this.repository.create(dto);
    return this.repository.save(tipo);
  }

  async update(id_tipos_habitacion: number, dto: UpdateTiposHabitacionDto): Promise<TiposHabitacion> {
    const tipo = await this.findOne(id_tipos_habitacion);
    Object.assign(tipo, dto);
    return this.repository.save(tipo);
  }

  async remove(id_tipos_habitacion: number): Promise<void> {
    const tipo = await this.findOne(id_tipos_habitacion);
    await this.repository.remove(tipo);
  }
}
