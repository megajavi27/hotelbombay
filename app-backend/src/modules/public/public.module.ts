import { Module } from '@nestjs/common';
import { TiposHabitacionModule } from '../tipos-habitacion/tipos-habitacion.module';
import { PublicController } from './public.controller';

@Module({
  imports: [TiposHabitacionModule],
  controllers: [PublicController],
})
export class PublicModule {}
