import { PartialType } from '@nestjs/swagger';
import { CreateRecomendacionIaDto } from './create-recomendacion-ia.dto';

export class UpdateRecomendacionIaDto extends PartialType(CreateRecomendacionIaDto) {}
