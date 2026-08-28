import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CategoriaRecomendacion } from '../recomendacion-ia.entity';

export class CreateRecomendacionIaDto {
  @ApiProperty({ example: 'Malecón 2000' })
  @IsString()
  titulo?: string;

  @ApiProperty({ enum: CategoriaRecomendacion })
  @IsEnum(CategoriaRecomendacion)
  categoria?: CategoriaRecomendacion;

  @ApiProperty({ required: false, example: 'Hermoso paseo costero ideal para caminar al atardecer.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ required: false, example: 'Centro de la ciudad' })
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiProperty({ required: false, example: 1.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distancia_km?: number;

  @ApiProperty({ required: false, example: 4.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  calificacion?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imagen_url?: string;

  @ApiProperty({ required: false, description: 'Empleado que registró la recomendación.' })
  @IsOptional()
  @IsInt()
  id_empleado?: number;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
