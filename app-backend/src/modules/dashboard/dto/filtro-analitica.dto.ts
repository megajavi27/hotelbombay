import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Filtros de período del dashboard. Sin año se toma todo el histórico. */
export class FiltroAnaliticaDto {
  @ApiPropertyOptional({ description: 'Año a consultar. Si se omite se incluye todo el histórico.', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;

  @ApiPropertyOptional({ description: 'Mes (1-12). Solo se aplica junto con el año.', example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;
}
