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
import { TiposHabitacionService } from './tipos-habitacion.service';
import { CreateTiposHabitacionDto } from './dto/create-tipos-habitacion.dto';
import { UpdateTiposHabitacionDto } from './dto/update-tipos-habitacion.dto';

@ApiTags('Tipos de Habitación')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tipos-habitacion')
export class TiposHabitacionController {
  constructor(private readonly service: TiposHabitacionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los tipos de habitación.' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de habitación por id.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo tipo de habitación.' })
  create(@Body() dto: CreateTiposHabitacionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar un tipo de habitación.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTiposHabitacionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar un tipo de habitación.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
