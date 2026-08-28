import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EstadoReserva } from '../reserva.entity';

export class CreateReservaDto {
  @ApiProperty({ example: 1, required: false, description: 'Obligatorio para empleados. Los clientes lo obtienen del JWT.' })
  @IsOptional()
  @IsInt()
  id_cliente: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  id_habitacion: number;

  @ApiProperty({ required: false, example: 1, description: 'Si no se envía, se asigna el empleado autenticado.' })
  @IsOptional()
  @IsInt()
  id_empleado?: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  fecha_fin: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  numero_huespedes?: number;

  @ApiProperty({ enum: EstadoReserva, default: EstadoReserva.PENDIENTE, required: false })
  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
