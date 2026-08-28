import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TipoDocumento } from '../../usuario/usuario.entity';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  apellido: string;

  @ApiProperty({ example: 'usuario@hotelbombay.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @ApiProperty({ enum: TipoDocumento, default: TipoDocumento.CEDULA })
  @IsEnum(TipoDocumento)
  tipo_documento: TipoDocumento;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  numero_documento: string;

  @ApiPropertyOptional({ example: '0991234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ example: 'Clave123!' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres.' })
  password: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({ default: true, description: 'FALSE oculta la cuenta del listado (cuentas de sistema).' })
  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}
