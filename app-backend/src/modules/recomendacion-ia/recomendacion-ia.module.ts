import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecomendacionIa } from './recomendacion-ia.entity';
import { RecomendacionIaService } from './recomendacion-ia.service';
import { RecomendacionIaController } from './recomendacion-ia.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RecomendacionIa])],
  controllers: [RecomendacionIaController],
  providers: [RecomendacionIaService],
  exports: [RecomendacionIaService],
})
export class RecomendacionIaModule {}
