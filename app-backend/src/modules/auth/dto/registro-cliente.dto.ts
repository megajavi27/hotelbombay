import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumento } from '../../usuario/usuario.entity';
import { EsNumeroDocumento } from '../../../common/validators/numero-documento.validator';

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
  @EsNumeroDocumento()
  numero_documento: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  telefono?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  direccion?: string;

  /**
   * Obligatoria. La validación del navegador solo evita el error honesto: quien
   * llame a la API directamente se la puede saltar, y entonces el dato que
   * alimenta el panel de nacionalidades del dashboard llegaría vacío.
   */
  @ApiProperty({ example: 'Ecuador' })
  @IsNotEmpty({ message: 'La nacionalidad es obligatoria.' })
  @IsString()
  nacionalidad: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  fecha_nacimiento?: string;
}
