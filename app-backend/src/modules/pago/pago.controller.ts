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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FiltroPagoDto } from './dto/filtro-pago.dto';
import { PagoService } from './pago.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { PagarReservaDto } from './dto/pagar-reserva.dto';
import { TransferenciaPagoDto, RechazarTransferenciaDto } from './dto/transferencia.dto';

const TIPOS_PERMITIDOS = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];

const multerStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'comprobantes'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `comprobante-${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('Pagos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pago')
export class PagoController {
  constructor(private readonly service: PagoService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Listar todos los pagos.' })
  findAll(@Query() filtro: FiltroPagoDto) {
    return this.service.findAll(filtro);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Obtener un pago por id.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // ── CLIENTE: pago con tarjeta ─────────────────────────────────────────────
  @Post('mi-pago')
  @Roles('cliente')
  @ApiOperation({ summary: 'Cliente paga con tarjeta (simulado).' })
  pagarMiReserva(@Body() dto: PagarReservaDto, @CurrentUser() user: any) {
    return this.service.pagarMiReserva(dto, user.id_cliente);
  }

  // ── CLIENTE: pago por transferencia + comprobante ─────────────────────────
  @Post('mi-transferencia')
  @Roles('cliente')
  @ApiOperation({ summary: 'Cliente registra transferencia y sube comprobante.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('comprobante', {
      storage: multerStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (TIPOS_PERMITIDOS.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Tipo de archivo no permitido. Use: ${TIPOS_PERMITIDOS.join(', ')}`), false);
        }
      },
    }),
  )
  registrarTransferencia(
    @Body() dto: TransferenciaPagoDto,
    @UploadedFile() file: { filename: string; originalname: string; mimetype: string; size: number; path: string; fieldname: string },
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('Debes adjuntar el comprobante de transferencia.');
    const comprobanteUrl = `/uploads/comprobantes/${file.filename}`;
    return this.service.registrarTransferencia(dto, user.id_cliente, comprobanteUrl);
  }

  // ── EMPLEADO: validar transferencia ──────────────────────────────────────
  @Post(':id/validar')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Empleado valida un comprobante de transferencia.' })
  validarTransferencia(@Param('id', ParseIntPipe) id: number) {
    return this.service.validarTransferencia(id);
  }

  // ── EMPLEADO: rechazar transferencia ─────────────────────────────────────
  @Post(':id/rechazar')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Empleado rechaza un comprobante de transferencia.' })
  rechazarTransferencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarTransferenciaDto,
  ) {
    return this.service.rechazarTransferencia(id, dto);
  }

  // ── EMPLEADO: cobrar en efectivo por id_pago ─────────────────────────────
  @Patch(':id/cobrar-efectivo')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Empleado registra el cobro en efectivo de un pago pendiente.' })
  cobrarEfectivo(@Param('id', ParseIntPipe) id: number) {
    return this.service.cobrarEfectivo(id);
  }

  // ── EMPLEADO: cobrar en efectivo por id_reserva ───────────────────────────
  @Patch('cobrar-reserva/:id_reserva')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Empleado cobra en efectivo buscando por id_reserva.' })
  cobrarEfectivoPorReserva(@Param('id_reserva', ParseIntPipe) id_reserva: number) {
    return this.service.cobrarEfectivoPorReserva(id_reserva);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Registrar un nuevo pago para una reserva.' })
  create(@Body() dto: CreatePagoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Actualizar un pago.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePagoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar un pago.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
