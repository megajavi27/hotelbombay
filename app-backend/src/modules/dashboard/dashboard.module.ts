import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Reserva } from '../reserva/reserva.entity';
import { Pago } from '../pago/pago.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

/**
 * Solo se registran las tres entidades cuyos repositorios se inyectan. Los tipos
 * de habitación, clientes y usuarios se alcanzan por JOIN desde reserva, y para
 * eso basta con que estén declarados en la conexión.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Habitacion, Reserva, Pago])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
