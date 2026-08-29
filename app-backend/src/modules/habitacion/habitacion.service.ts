import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { Habitacion, EstadoHabitacion } from './habitacion.entity';
import { HabitacionImagenService } from './habitacion-imagen.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';

@Injectable()
export class HabitacionService {
  constructor(
    @InjectRepository(Habitacion)
    private readonly repository: Repository<Habitacion>,
    private readonly imagenService: HabitacionImagenService,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PagedResult<Habitacion>> {
    const { page = 1, limit = 10 } = pagination;
    const [data, total] = await this.repository.findAndCount({
      relations: { imagenes: true },
      order: { numero: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((h) => this.ordenarImagenes(h)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findDisponibles(): Promise<Habitacion[]> {
    const habitaciones = await this.repository.find({
      where: { estado: EstadoHabitacion.DISPONIBLE },
      relations: { imagenes: true },
      order: { numero: 'ASC' },
    });
    return habitaciones.map((h) => this.ordenarImagenes(h));
  }

  async findOne(id_habitacion: number): Promise<Habitacion> {
    const habitacion = await this.repository.findOne({
      where: { id_habitacion },
      relations: { imagenes: true },
    });
    if (!habitacion) {
      throw new NotFoundException(`No se encontró la habitación con id ${id_habitacion}.`);
    }
    return this.ordenarImagenes(habitacion);
  }

  async create(dto: CreateHabitacionDto): Promise<Habitacion> {
    await this.verificarNumeroLibre(dto.numero);
    const habitacion = this.repository.create(dto);
    return this.repository.save(habitacion);
  }

  async update(id_habitacion: number, dto: UpdateHabitacionDto): Promise<Habitacion> {
    const habitacion = await this.findOne(id_habitacion);
    if (dto.numero && dto.numero !== habitacion.numero) {
      await this.verificarNumeroLibre(dto.numero);
    }
    Object.assign(habitacion, dto);
    return this.repository.save(habitacion);
  }

  /**
   * `habitacion.numero` es UNIQUE en la base de datos.
   *
   * Sin esta comprobación el duplicado lo detectaba MySQL, TypeORM lo convertía
   * en un QueryFailedError y Nest lo devolvía como un 500 genérico: el usuario
   * veía "Ocurrió un error al guardar" y no había forma de saber que el problema
   * era simplemente que ese número de habitación ya existía.
   */
  private async verificarNumeroLibre(numero: string): Promise<void> {
    const existente = await this.repository.findOne({ where: { numero } });
    if (existente) {
      throw new ConflictException(
        `Ya existe la habitación número ${numero}. Usa otro número.`,
      );
    }
  }

  async remove(id_habitacion: number): Promise<void> {
    const habitacion = await this.findOne(id_habitacion);
    // Las filas de habitacion_imagen las borra la FK en cascada, pero los
    // archivos del disco hay que limpiarlos a mano antes de perder sus rutas.
    await this.imagenService.borrarArchivosDeHabitacion(id_habitacion);
    await this.repository.remove(habitacion);
  }

  /**
   * Deja la portada primero y el resto por `orden`. Se hace en memoria y no en
   * la consulta porque ordenar una relación OneToMany paginada obliga a TypeORM
   * a cambiar de estrategia de consulta, y la galería es de 15 fotos como mucho.
   */
  private ordenarImagenes(habitacion: Habitacion): Habitacion {
    if (habitacion.imagenes?.length) {
      habitacion.imagenes.sort((a, b) => {
        if (a.es_portada !== b.es_portada) return a.es_portada ? -1 : 1;
        if (a.orden !== b.orden) return a.orden - b.orden;
        return a.id_imagen - b.id_imagen;
      });
    }
    return habitacion;
  }
}
