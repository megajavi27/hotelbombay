import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Perfil } from './perfil.entity';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Perfil)
    private readonly perfilRepository: Repository<Perfil>,
  ) {}

  findAll(): Promise<Perfil[]> {
    return this.perfilRepository.find({ order: { id_perfil: 'ASC' } });
  }

  async findOne(id_perfil: number): Promise<Perfil> {
    const perfil = await this.perfilRepository.findOne({ where: { id_perfil } });
    if (!perfil) {
      throw new NotFoundException(`No se encontró el perfil con id ${id_perfil}.`);
    }
    return perfil;
  }
}
