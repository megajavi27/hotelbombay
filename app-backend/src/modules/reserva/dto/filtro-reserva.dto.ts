import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FiltroReservaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Buscar por nombre, apellido o documento del cliente' })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({ description: 'Filtrar reservas con fecha_inicio >= este valor (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fecha_inicio?: string;

  @ApiPropertyOptional({ description: 'Filtrar reservas con fecha_fin <= este valor (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fecha_fin?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado: PENDIENTE | CONFIRMADA | CHECKIN | CHECKOUT | CANCELADA' })
  @IsOptional()
  @IsString()
  estado?: string;
}
