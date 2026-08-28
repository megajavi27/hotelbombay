import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength, Matches, IsOptional } from 'class-validator';

export class PagarReservaDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  id_reserva: number;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(3)
  nombre_tarjeta: string;

  /** Últimos 4 dígitos — el frontend nunca envía el número completo al backend */
  @ApiProperty({ example: '4242' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'ultimos_4 debe tener exactamente 4 dígitos.' })
  ultimos_4: string;

  @ApiProperty({ example: 1, description: '1, 3, 6 o 12 cuotas' })
  @IsInt()
  @Min(1)
  cuotas: number;

  @ApiProperty({ example: 'VISA', required: false })
  @IsOptional()
  @IsString()
  tipo_tarjeta?: string;
}
