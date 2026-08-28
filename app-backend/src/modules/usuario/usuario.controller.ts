import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { TipoDocumento } from './usuario.entity';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) { }

  /**
   * Búsqueda por documento — accesible para cualquier empleado.
   * Devuelve datos del usuario + flags esEmpleado / esCliente.
   * 404 si no existe.
   */
  @Get('buscar')
  @Roles('empleado')
  @ApiOperation({ summary: 'Buscar usuario por tipo y número de documento.' })
  @ApiQuery({ name: 'tipo_documento', enum: TipoDocumento })
  @ApiQuery({ name: 'numero_documento', type: String })
  async buscarPorDocumento(
    @Query('tipo_documento') tipo_documento: TipoDocumento,
    @Query('numero_documento') numero_documento: string,
  ) {
    const resultado = await this.usuarioService.buscarPorDocumento(tipo_documento, numero_documento);
    if (!resultado) {
      throw new NotFoundException('No se encontró ningún usuario con ese documento.');
    }
    return resultado;
  }

  @Get()
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Listar todas las cuentas de usuario.' })
  findAll(@Query() pagination: PaginationDto) {
    return this.usuarioService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Obtener una cuenta de usuario por id.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear una cuenta de usuario directamente.' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarioService.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar una cuenta de usuario.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.usuarioService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una cuenta de usuario.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.remove(id);
  }
}
