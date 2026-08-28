import { PartialType } from '@nestjs/swagger';
import { CreateTiposHabitacionDto } from './create-tipos-habitacion.dto';

export class UpdateTiposHabitacionDto extends PartialType(CreateTiposHabitacionDto) {}
