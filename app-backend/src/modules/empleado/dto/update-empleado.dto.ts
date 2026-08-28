import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEmpleadoDto } from './create-empleado.dto';

export class UpdateEmpleadoDto extends PartialType(OmitType(CreateEmpleadoDto, ['email', 'password'] as const)) {}
