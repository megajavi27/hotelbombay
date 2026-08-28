import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago } from '../pago/pago.entity';
import { Reserva } from '../reserva/reserva.entity';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Cliente } from '../cliente/cliente.entity';
import { ReporteService } from './reporte.service';
import { ReporteController } from './reporte.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pago, Reserva, Habitacion, Cliente])],
  controllers: [ReporteController],
  providers: [ReporteService],
})
export class ReporteModule {}
