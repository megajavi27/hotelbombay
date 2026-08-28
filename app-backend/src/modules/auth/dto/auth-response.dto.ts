import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UsuarioAutenticadoDto {
  @ApiProperty() id_usuario: number;
  @ApiProperty() email: string;
  @ApiProperty() nombreCompleto: string;
  @ApiProperty({ enum: ['empleado', 'cliente'] }) tipo: 'empleado' | 'cliente';
  @ApiPropertyOptional() perfil?: string;      // nombre del perfil (solo empleados)
  @ApiPropertyOptional() id_empleado?: number;
  @ApiPropertyOptional() id_cliente?: number;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: UsuarioAutenticadoDto }) usuario: UsuarioAutenticadoDto;
}
