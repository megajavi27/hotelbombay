import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';

// En edición no se permite cambiar email/contraseña desde este endpoint.
export class UpdateClienteDto extends PartialType(OmitType(CreateClienteDto, ['email', 'password'] as const)) {}
