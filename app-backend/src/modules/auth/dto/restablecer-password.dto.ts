import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RestablecerPasswordDto {
  @ApiProperty({ description: 'Token recibido en el enlace del correo.' })
  @IsString()
  @IsNotEmpty({ message: 'El enlace de recuperación no es válido.' })
  token: string;

  @ApiProperty({ example: 'NuevaClave123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;
}
