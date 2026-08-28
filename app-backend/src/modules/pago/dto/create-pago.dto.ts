import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EstadoPago, MetodoPago } from '../pago.entity';

export class CreatePagoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id_reserva: number;

  @ApiProperty({ example: 260.0 })
  @IsNumber()
  @Min(0)
  monto: number;

  @ApiProperty({ enum: MetodoPago })
  @IsEnum(MetodoPago)
  metodo_pago: MetodoPago;

  @ApiProperty({ enum: EstadoPago, default: EstadoPago.PENDIENTE, required: false })
  @IsOptional()
  @IsEnum(EstadoPago)
  estado?: EstadoPago;

  @ApiProperty({ required: false, example: 'TRX-00123' })
  @IsOptional()
  @IsString()
  referencia?: string;
}
