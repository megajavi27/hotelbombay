import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class OlvidePasswordDto {
  @ApiProperty({ example: 'cliente@correo.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;
}
