import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TiposHabitacionService } from '../tipos-habitacion/tipos-habitacion.service';

/**
 * Endpoints públicos, sin autenticación: exponen únicamente la información que
 * un visitante debe poder ver antes de iniciar sesión (catálogo de tipos de
 * habitación con precio, capacidad, servicios e imagen). Deliberadamente NO
 * expone datos de huéspedes, reservas, pagos ni habitaciones individuales.
 */
@ApiTags('Público')
@Controller('public')
export class PublicController {
  constructor(private readonly tiposHabitacionService: TiposHabitacionService) {}

  @Get('tipos-habitacion')
  @ApiOperation({ summary: 'Catálogo público de tipos de habitación activos (sin autenticación).' })
  tiposHabitacion() {
    return this.tiposHabitacionService.findActivosPublico();
  }
}
