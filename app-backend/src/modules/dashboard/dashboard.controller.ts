import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { DashboardService } from './dashboard.service';
import { FiltroAnaliticaDto } from './dto/filtro-analitica.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.EMPLEADO)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('analitica')
  @ApiOperation({
    summary:
      'Indicadores y series del dashboard (general y clientes), filtrados por año y mes.',
  })
  getAnalitica(@Query() filtro: FiltroAnaliticaDto) {
    return this.service.getAnalitica(filtro.anio, filtro.mes);
  }
}
