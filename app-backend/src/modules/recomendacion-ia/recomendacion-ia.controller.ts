import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RecomendacionIaService } from './recomendacion-ia.service';
import { CreateRecomendacionIaDto } from './dto/create-recomendacion-ia.dto';
import { UpdateRecomendacionIaDto } from './dto/update-recomendacion-ia.dto';

@ApiTags('Recomendaciones IA')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recomendacion-ia')
export class RecomendacionIaController {
  constructor(private readonly service: RecomendacionIaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las recomendaciones (administración).' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get('activas')
  @ApiOperation({ summary: 'Listar recomendaciones activas para mostrar al cliente.' })
  findActivas() {
    return this.service.findActivas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una recomendación por id.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Crear una nueva recomendación turística/gastronómica.' })
  create(@Body() dto: CreateRecomendacionIaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Actualizar una recomendación.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecomendacionIaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar una recomendación.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
