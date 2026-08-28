import { IsInt, IsPositive, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferenciaPagoDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_reserva: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}

export class RechazarTransferenciaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio.' })
  motivo: string;
}
