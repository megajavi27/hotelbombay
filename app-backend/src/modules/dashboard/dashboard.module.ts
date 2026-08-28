import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Reserva } from '../reserva/reserva.entity';
import { Pago } from '../pago/pago.entity';
import { Cliente } from '../cliente/cliente.entity';
import { Empleado } from '../empleado/empleado.entity';
import { RecomendacionIa } from '../recomendacion-ia/recomendacion-ia.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Habitacion, Reserva, Pago, Cliente, Empleado, RecomendacionIa]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
