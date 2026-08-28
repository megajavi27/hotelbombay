import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habitacion } from './habitacion.entity';
import { HabitacionImagen } from './habitacion-imagen.entity';
import { HabitacionService } from './habitacion.service';
import { HabitacionImagenService } from './habitacion-imagen.service';
import { HabitacionController } from './habitacion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Habitacion, HabitacionImagen])],
  controllers: [HabitacionController],
  providers: [HabitacionService, HabitacionImagenService],
  exports: [HabitacionService, HabitacionImagenService],
})
export class HabitacionModule {}
