import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { ReporteService } from './reporte.service';

@ApiTags('Reportes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reporte')
export class ReporteController {
  constructor(private readonly service: ReporteService) {}

  @Get('ventas')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'PDF de ingresos (todos los pagos completados).' })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  async ventas(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Res() res?: Response,
  ) {
    const pdf = await this.service.generarVentas(desde, hasta);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', 'attachment; filename="reporte-ingresos.pdf"');
    res!.end(pdf);
  }

  @Get('efectivo')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'PDF de cobros en efectivo.' })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  async efectivo(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Res() res?: Response,
  ) {
    const pdf = await this.service.generarEfectivo(desde, hasta);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', 'attachment; filename="reporte-efectivo.pdf"');
    res!.end(pdf);
  }

  @Get('ocupacion')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'PDF de habitaciones ocupadas (snapshot actual).' })
  async ocupacion(@Res() res?: Response) {
    const pdf = await this.service.generarOcupacion();
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', 'attachment; filename="reporte-ocupacion.pdf"');
    res!.end(pdf);
  }

  @Get('reservas')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'PDF de reservas filtradas por período y estado.' })
  @ApiQuery({ name: 'desde',  required: false })
  @ApiQuery({ name: 'hasta',  required: false })
  @ApiQuery({ name: 'estado', required: false })
  async reservas(
    @Query('desde')  desde?: string,
    @Query('hasta')  hasta?: string,
    @Query('estado') estado?: string,
    @Res() res?: Response,
  ) {
    const pdf = await this.service.generarReservas(desde, hasta, estado);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', 'attachment; filename="reporte-reservas.pdf"');
    res!.end(pdf);
  }

  @Get('clientes')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'PDF de resumen de clientes y su actividad.' })
  async clientes(@Res() res?: Response) {
    const pdf = await this.service.generarClientes();
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', 'attachment; filename="reporte-clientes.pdf"');
    res!.end(pdf);
  }
}
