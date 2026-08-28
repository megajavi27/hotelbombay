import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposHabitacion } from './tipos-habitacion.entity';
import { Habitacion } from '../habitacion/habitacion.entity';
import { HabitacionImagen } from '../habitacion/habitacion-imagen.entity';
import { TiposHabitacionService } from './tipos-habitacion.service';
import { TiposHabitacionController } from './tipos-habitacion.controller';

@Module({
  // Habitacion y HabitacionImagen se registran aquí porque el catálogo público
  // reúne las fotos de las habitaciones de cada tipo (findActivosPublico).
  imports: [TypeOrmModule.forFeature([TiposHabitacion, Habitacion, HabitacionImagen])],
  controllers: [TiposHabitacionController],
  providers: [TiposHabitacionService],
  exports: [TiposHabitacionService],
})
export class TiposHabitacionModule {}
