import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTiposHabitacionDto {
  @ApiProperty({ example: 'Suite' })
  @IsString()
  nombre: string;

  @ApiProperty({ required: false, example: 'Suite de lujo con sala de estar independiente.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 140.0 })
  @IsNumber()
  @Min(0)
  precio_noche: number;

  @ApiProperty({ example: 4, default: 2 })
  @IsInt()
  @Min(1)
  capacidad_maxima: number;

  @ApiProperty({ required: false, example: 'WiFi, TV, Minibar, Jacuzzi' })
  @IsOptional()
  @IsString()
  servicios?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imagen_url?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
