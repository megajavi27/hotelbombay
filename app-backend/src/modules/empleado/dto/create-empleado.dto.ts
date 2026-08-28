import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { TipoDocumento } from '../../usuario/usuario.entity';

export class CreateEmpleadoDto {
  // ── Opción A: vincular a usuario existente ──────────────────────────────
  /** Si se provee id_usuario, los campos de cuenta/personales son ignorados. */
  @ApiPropertyOptional({ description: 'ID de usuario existente. Omitir si es persona nueva.' })
  @IsOptional()
  @IsNumber()
  id_usuario?: number;

  // ── Opción B: datos de cuenta (requerido solo si id_usuario no se provee) ─
  @ApiPropertyOptional({ example: 'empleado@hotelbombay.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email?: string;

  @ApiPropertyOptional({ example: 'Clave123!' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres.' })
  password?: string;

  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Gómez' })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional({ enum: TipoDocumento, default: TipoDocumento.CEDULA })
  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @ApiPropertyOptional({ example: '0923456789' })
  @IsOptional()
  @IsString()
  numero_documento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  // ── Datos del empleado (tabla empleado) ────────────────────────────────
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  id_perfil?: number;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  fecha_contratacion?: string;

  @ApiPropertyOptional({ example: 450.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salario?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
