import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumento } from '../../usuario/usuario.entity';

export class RegistroClienteDto {
  @ApiProperty() @IsNotEmpty() @IsString()
  nombre: string;

  @ApiProperty() @IsNotEmpty() @IsString()
  apellido: string;

  @ApiProperty() @IsEmail()
  email: string;

  @ApiProperty() @IsNotEmpty() @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: TipoDocumento })
  @IsOptional() @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @ApiProperty() @IsNotEmpty() @IsString()
  numero_documento: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  telefono?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  direccion?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  nacionalidad?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  fecha_nacimiento?: string;
}
