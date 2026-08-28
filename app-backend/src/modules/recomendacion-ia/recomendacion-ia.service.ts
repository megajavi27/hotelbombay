import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatEntityDates, formatEntityListDates } from '../../common/utils/date.util';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PagedResult } from '../../common/interfaces/paged-result.interface';
import { RecomendacionIa } from './recomendacion-ia.entity';
import { CreateRecomendacionIaDto } from './dto/create-recomendacion-ia.dto';
import { UpdateRecomendacionIaDto } from './dto/update-recomendacion-ia.dto';

const FECHA_FIELDS = { datetime: ['fecha_creacion'] };

@Injectable()
export class RecomendacionIaService {
  constructor(
    @InjectRepository(RecomendacionIa)
    private readonly repository: Repository<RecomendacionIa>,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PagedResult<RecomendacionIa>> {
    const { page = 1, limit = 10 } = pagination;
    const [recomendaciones, total] = await this.repository.findAndCount({
      order: { id_recomendacion_ia: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: formatEntityListDates(recomendaciones, FECHA_FIELDS),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findActivas(): Promise<RecomendacionIa[]> {
    const recomendaciones = await this.repository.find({ where: { activo: true }, order: { calificacion: 'DESC' } });
    return formatEntityListDates(recomendaciones, FECHA_FIELDS);
  }

  async findOne(id_recomendacion_ia: number): Promise<RecomendacionIa> {
    const recomendacion = await this.repository.findOne({ where: { id_recomendacion_ia } });
    if (!recomendacion) {
      throw new NotFoundException(`No se encontró la recomendación con id ${id_recomendacion_ia}.`);
    }
    return formatEntityDates(recomendacion, FECHA_FIELDS);
  }

  async create(dto: CreateRecomendacionIaDto): Promise<RecomendacionIa> {
    const recomendacion = this.repository.create(dto);
    const guardada = await this.repository.save(recomendacion);
    return formatEntityDates(guardada, FECHA_FIELDS);
  }

  async update(id_recomendacion_ia: number, dto: UpdateRecomendacionIaDto): Promise<RecomendacionIa> {
    const recomendacion = await this.findOne(id_recomendacion_ia);
    Object.assign(recomendacion, dto);
    const guardada = await this.repository.save(recomendacion);
    return formatEntityDates(guardada, FECHA_FIELDS);
  }

  async remove(id_recomendacion_ia: number): Promise<void> {
    const recomendacion = await this.findOne(id_recomendacion_ia);
    await this.repository.remove(recomendacion);
  }
}
