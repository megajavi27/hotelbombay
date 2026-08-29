import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { TipoDocumento } from '../../usuario/usuario.entity';
import { EsNumeroDocumento } from '../../../common/validators/numero-documento.validator';

export class CreateClienteDto {
  // ── Opción A: vincular a usuario existente ──────────────────────────────
  /** Si se provee id_usuario, los campos de cuenta/personales son ignorados. */
  @ApiPropertyOptional({ description: 'ID de usuario existente. Omitir si es persona nueva.' })
  @IsOptional()
  @IsNumber()
  id_usuario?: number;

  // ── Opción B: datos de cuenta (requerido solo si id_usuario no se provee) ─
  @ApiPropertyOptional({ example: 'cliente@correo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email?: string;

  @ApiPropertyOptional({ example: 'Clave123!' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres.' })
  password?: string;

  @ApiPropertyOptional({ example: 'Javier' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Noboa' })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional({ enum: TipoDocumento, default: TipoDocumento.CEDULA })
  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  @EsNumeroDocumento()
  numero_documento?: string;

  @ApiPropertyOptional({ example: '0991234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  // ── Datos del cliente (tabla cliente) ──────────────────────────────────
  /**
   * Obligatoria, se cree el cliente desde cero o se vincule a un usuario que ya
   * existe: en ambos casos la fila de `cliente` es nueva y necesita el dato.
   * Se guarda el nombre del país ("Ecuador") y no el gentilicio, que es como lo
   * agrupa el dashboard.
   */
  @ApiProperty({ example: 'Ecuador' })
  @IsNotEmpty({ message: 'La nacionalidad es obligatoria.' })
  @IsString()
  nacionalidad: string;

  @ApiPropertyOptional({ example: '1995-08-20' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
