import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EstadoHabitacion } from '../habitacion.entity';

export class CreateHabitacionDto {
  @ApiProperty({ example: '101' })
  @IsString()
  numero: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  piso?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  id_tipos_habitacion: number;

  @ApiProperty({ enum: EstadoHabitacion, default: EstadoHabitacion.DISPONIBLE })
  @IsEnum(EstadoHabitacion)
  @IsOptional()
  estado?: EstadoHabitacion;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
