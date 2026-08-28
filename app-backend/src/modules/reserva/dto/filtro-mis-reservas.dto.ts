import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroMisReservasDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() fecha_inicio?: string;
  @IsOptional() @IsString() fecha_fin?: string;
}
