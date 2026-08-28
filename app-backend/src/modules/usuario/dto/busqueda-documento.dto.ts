import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { TipoDocumento } from '../usuario.entity';

export class BusquedaDocumentoDto {
  @ApiProperty({ enum: TipoDocumento })
  @IsEnum(TipoDocumento)
  tipo_documento: TipoDocumento;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  numero_documento: string;
}

export class BusquedaDocumentoResultDto {
  @ApiProperty() id_usuario: number;
  @ApiProperty() nombre: string;
  @ApiProperty() apellido: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: TipoDocumento }) tipo_documento: TipoDocumento;
  @ApiProperty() numero_documento: string;
  @ApiProperty({ required: false }) telefono?: string;
  @ApiProperty({ required: false }) direccion?: string;
  @ApiProperty() esEmpleado: boolean;
  @ApiProperty() esCliente: boolean;
}
