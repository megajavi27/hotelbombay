import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { HabitacionService } from './habitacion.service';
import {
  ArchivoSubido,
  CARPETA_IMAGENES_HABITACION,
  HabitacionImagenService,
  MAX_IMAGENES_POR_HABITACION,
} from './habitacion-imagen.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';

/** Tamaño máximo por foto. */
const MAX_BYTES_POR_FOTO = 5 * 1024 * 1024; // 5 MB

/** Fotos admitidas en una sola subida. */
const MAX_FOTOS_POR_SUBIDA = 10;

/**
 * Solo imágenes. Se comprueban extensión y mimetype: la extensión por sí sola
 * es trivial de falsificar renombrando el archivo.
 */
const EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp'];
const MIMETYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// multer no crea la carpeta destino: si no existe, la subida falla.
mkdirSync(CARPETA_IMAGENES_HABITACION, { recursive: true });

const almacenamientoImagenes = diskStorage({
  destination: CARPETA_IMAGENES_HABITACION,
  filename: (_req, file, cb) => {
    const unico = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `habitacion-${unico}${extname(file.originalname).toLowerCase()}`);
  },
});

@ApiTags('Habitaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('habitacion')
export class HabitacionController {
  constructor(
    private readonly service: HabitacionService,
    private readonly imagenService: HabitacionImagenService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las habitaciones (incluye su galería de fotos).' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Listar únicamente las habitaciones disponibles (incluye su galería).' })
  findDisponibles() {
    return this.service.findDisponibles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una habitación por id (incluye su galería).' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Crear una nueva habitación.' })
  create(@Body() dto: CreateHabitacionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Actualizar una habitación.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHabitacionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar una habitación.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ── Galería de fotos ───────────────────────────────────────────────────────

  @Get(':id/imagenes')
  @ApiOperation({ summary: 'Listar las fotos de una habitación (la portada primero).' })
  listarImagenes(@Param('id', ParseIntPipe) id: number) {
    return this.imagenService.listar(id);
  }

  @Post(':id/imagenes')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({
    summary: `Subir fotos a una habitación (hasta ${MAX_FOTOS_POR_SUBIDA} por vez, ${MAX_IMAGENES_POR_HABITACION} en total).`,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('imagenes', MAX_FOTOS_POR_SUBIDA, {
      storage: almacenamientoImagenes,
      limits: { fileSize: MAX_BYTES_POR_FOTO, files: MAX_FOTOS_POR_SUBIDA },
      fileFilter: (_req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();
        if (EXTENSIONES_PERMITIDAS.includes(extension) && MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `"${file.originalname}" no es una imagen válida. Formatos admitidos: ${EXTENSIONES_PERMITIDAS.join(', ')}.`,
            ),
            false,
          );
        }
      },
    }),
  )
  subirImagenes(@Param('id', ParseIntPipe) id: number, @UploadedFiles() archivos: ArchivoSubido[]) {
    if (!archivos || archivos.length === 0) {
      throw new BadRequestException('Debes adjuntar al menos una foto.');
    }
    return this.imagenService.agregar(id, archivos);
  }

  @Delete(':id/imagenes/:idImagen')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Eliminar una foto de la galería (borra también el archivo del disco).' })
  eliminarImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('idImagen', ParseIntPipe) idImagen: number,
  ) {
    return this.imagenService.eliminar(id, idImagen);
  }

  @Patch(':id/imagenes/:idImagen/portada')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Marcar una foto como portada de la habitación.' })
  marcarPortada(
    @Param('id', ParseIntPipe) id: number,
    @Param('idImagen', ParseIntPipe) idImagen: number,
  ) {
    return this.imagenService.marcarPortada(id, idImagen);
  }
}
