import {
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
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FiltroReservaDto } from './dto/filtro-reserva.dto';
import { FiltroMisReservasDto } from './dto/filtro-mis-reservas.dto';
import { ReservaService } from './reserva.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@ApiTags('Reservas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reserva')
export class ReservaController {
  constructor(private readonly service: ReservaService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Listar todas las reservas.' })
  findAll(@Query() filtro: FiltroReservaDto) {
    return this.service.findAll(filtro);
  }

  @Get('mis-reservas')
  @Roles('cliente')
  @ApiOperation({ summary: 'Listar las reservas del cliente autenticado.' })
  getMisReservas(@CurrentUser() user: any, @Query() filtro: FiltroMisReservasDto) {
    if (!user?.id_cliente) {
      throw new NotFoundException('No se encontró el perfil de cliente para este usuario.');
    }
    return this.service.findByCliente(user.id_cliente, filtro);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO, 'cliente')
  @ApiOperation({ summary: 'Obtener una reserva por id. Un cliente solo puede ver sus propias reservas.' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.EMPLEADO, 'cliente')
  @ApiOperation({ summary: 'Crear una nueva reserva. El total se calcula automáticamente.' })
  create(@Body() dto: CreateReservaDto, @CurrentUser() user: any) {
    // Si es cliente, forzar id_cliente al suyo propio
    if (user?.tipo === 'cliente') {
      dto.id_cliente = user.id_cliente;
    }
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Actualizar una reserva (cambiar estado, fechas, etc).' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservaDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/checkin')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Hacer check-in: CONFIRMADA → CHECKIN, habitación → OCUPADA.' })
  checkIn(@Param('id', ParseIntPipe) id: number) {
    return this.service.checkIn(id);
  }

  @Patch(':id/checkout')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Hacer check-out: CHECKIN → CHECKOUT, habitación → DISPONIBLE.' })
  checkOut(@Param('id', ParseIntPipe) id: number) {
    return this.service.checkOut(id);
  }

  @Patch('mis-reservas/:id/cancelar')
  @Roles('cliente')
  @ApiOperation({ summary: 'Cliente cancela su propia reserva. Si no está pagada se elimina; si está pagada cambia a CANCELADA.' })
  cancelarMiReserva(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.cancelarMiReserva(id, user.id_cliente);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar una reserva.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
