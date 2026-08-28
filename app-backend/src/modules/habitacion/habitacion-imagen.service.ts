import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
import { HabitacionImagen } from './habitacion-imagen.entity';
import { Habitacion } from './habitacion.entity';

/** Carpeta física donde se guardan las fotos de las habitaciones. */
export const CARPETA_IMAGENES_HABITACION = join(process.cwd(), 'uploads', 'habitacion');

/** Prefijo público con el que se sirven (ver useStaticAssets en main.ts). */
export const RUTA_PUBLICA_IMAGENES_HABITACION = '/uploads/habitacion';

/** Máximo de fotos por habitación. */
export const MAX_IMAGENES_POR_HABITACION = 15;

/** Datos que necesitamos de cada archivo subido por multer. */
export interface ArchivoSubido {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

@Injectable()
export class HabitacionImagenService {
  private readonly logger = new Logger(HabitacionImagenService.name);

  constructor(
    @InjectRepository(HabitacionImagen)
    private readonly repository: Repository<HabitacionImagen>,
    @InjectRepository(Habitacion)
    private readonly habitacionRepository: Repository<Habitacion>,
    private readonly dataSource: DataSource,
  ) {}

  /** Fotos de una habitación, con la portada primero. */
  async listar(id_habitacion: number): Promise<HabitacionImagen[]> {
    await this.verificarHabitacion(id_habitacion);
    return this.repository.find({
      where: { id_habitacion },
      order: { es_portada: 'DESC', orden: 'ASC', id_imagen: 'ASC' },
    });
  }

  /**
   * Registra en la base las fotos que multer ya dejó en disco.
   *
   * Si la habitación todavía no tiene portada, la primera foto de este lote pasa
   * a serlo, para que el listado siempre tenga una miniatura que mostrar.
   */
  async agregar(id_habitacion: number, archivos: ArchivoSubido[]): Promise<HabitacionImagen[]> {
    if (!archivos || archivos.length === 0) {
      throw new BadRequestException('Debes seleccionar al menos una foto.');
    }

    try {
      await this.verificarHabitacion(id_habitacion);
    } catch (error) {
      // La habitación no existe, pero multer ya dejó los archivos en disco:
      // hay que limpiarlos antes de propagar el error.
      await this.borrarArchivos(archivos.map((a) => a.filename));
      throw error;
    }

    const existentes = await this.repository.count({ where: { id_habitacion } });
    if (existentes + archivos.length > MAX_IMAGENES_POR_HABITACION) {
      await this.borrarArchivos(archivos.map((a) => a.filename));
      throw new BadRequestException(
        `Una habitación admite como máximo ${MAX_IMAGENES_POR_HABITACION} fotos. ` +
        `Esta ya tiene ${existentes}; borra algunas antes de subir ${archivos.length} más.`,
      );
    }

    const hayPortada = (await this.repository.count({ where: { id_habitacion, es_portada: true } })) > 0;
    const maximoOrden = await this.siguienteOrden(id_habitacion);

    const nuevas = archivos.map((archivo, indice) =>
      this.repository.create({
        id_habitacion,
        url: `${RUTA_PUBLICA_IMAGENES_HABITACION}/${archivo.filename}`,
        orden: maximoOrden + indice,
        es_portada: !hayPortada && indice === 0,
      }),
    );

    await this.repository.save(nuevas);
    return this.listar(id_habitacion);
  }

  /**
   * Borra una foto: primero la fila, después el archivo. Si era la portada,
   * promueve la siguiente para que la habitación no se quede sin miniatura.
   */
  async eliminar(id_habitacion: number, id_imagen: number): Promise<HabitacionImagen[]> {
    const imagen = await this.repository.findOne({ where: { id_imagen, id_habitacion } });
    if (!imagen) {
      throw new NotFoundException('Esa foto no existe o no pertenece a esta habitación.');
    }

    const eraPortada = imagen.es_portada;
    await this.repository.remove(imagen);
    await this.borrarArchivos([basename(imagen.url)]);

    if (eraPortada) {
      const siguiente = await this.repository.findOne({
        where: { id_habitacion },
        order: { orden: 'ASC', id_imagen: 'ASC' },
      });
      if (siguiente) {
        await this.repository.update(siguiente.id_imagen, { es_portada: true });
      }
    }

    return this.listar(id_habitacion);
  }

  /** Marca una foto como portada y desmarca las demás de esa habitación. */
  async marcarPortada(id_habitacion: number, id_imagen: number): Promise<HabitacionImagen[]> {
    const imagen = await this.repository.findOne({ where: { id_imagen, id_habitacion } });
    if (!imagen) {
      throw new NotFoundException('Esa foto no existe o no pertenece a esta habitación.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(HabitacionImagen, { id_habitacion }, { es_portada: false });
      await manager.update(HabitacionImagen, { id_imagen }, { es_portada: true });
    });

    return this.listar(id_habitacion);
  }

  /**
   * Borra del disco los archivos de todas las fotos de una habitación.
   *
   * Se llama justo ANTES de eliminar la habitación: las filas de
   * `habitacion_imagen` desaparecen solas por el ON DELETE CASCADE de la FK,
   * pero los archivos no, y quedarían ocupando espacio para siempre.
   */
  async borrarArchivosDeHabitacion(id_habitacion: number): Promise<void> {
    const imagenes = await this.repository.find({ where: { id_habitacion } });
    if (imagenes.length === 0) return;
    await this.borrarArchivos(imagenes.map((imagen) => basename(imagen.url)));
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────────

  private async verificarHabitacion(id_habitacion: number): Promise<void> {
    const existe = await this.habitacionRepository.count({ where: { id_habitacion } });
    if (existe === 0) {
      throw new NotFoundException(`No se encontró la habitación con id ${id_habitacion}.`);
    }
  }

  private async siguienteOrden(id_habitacion: number): Promise<number> {
    const fila = await this.repository
      .createQueryBuilder('img')
      .select('MAX(img.orden)', 'maximo')
      .where('img.id_habitacion = :id_habitacion', { id_habitacion })
      .getRawOne<{ maximo: number | null }>();
    return (Number(fila?.maximo) || 0) + 1;
  }

  /**
   * Borra archivos de la carpeta de fotos. Usa basename() a propósito: así una
   * url manipulada en la base no puede hacernos borrar fuera de esa carpeta.
   * Un archivo que ya no está no se considera error.
   */
  private async borrarArchivos(nombres: string[]): Promise<void> {
    for (const nombre of nombres) {
      const ruta = join(CARPETA_IMAGENES_HABITACION, basename(nombre));
      try {
        await unlink(ruta);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          this.logger.warn(`No se pudo borrar el archivo ${ruta}: ${error?.message}`);
        }
      }
    }
  }
}
