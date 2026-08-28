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
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FiltroClienteDto } from './dto/filtro-cliente.dto';
import { ClienteService } from './cliente.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@ApiTags('Clientes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cliente')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Listar todos los clientes.' })
  findAll(@Query() filtro: FiltroClienteDto) {
    return this.clienteService.findAll(filtro);
  }

  @Get('mi-perfil')
  @Roles('cliente')
  @ApiOperation({ summary: 'Obtener el perfil del cliente autenticado.' })
  getMiPerfil(@CurrentUser() user: any) {
    if (!user?.id_cliente) {
      throw new NotFoundException('No se encontró el perfil de cliente para este usuario.');
    }
    return this.clienteService.findOne(user.id_cliente);
  }

  @Put('mi-perfil')
  @Roles('cliente')
  @ApiOperation({ summary: 'Actualizar el perfil del cliente autenticado.' })
  updateMiPerfil(@CurrentUser() user: any, @Body() dto: UpdateClienteDto) {
    if (!user?.id_cliente) {
      throw new NotFoundException('No se encontró el perfil de cliente para este usuario.');
    }
    return this.clienteService.update(user.id_cliente, dto);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Obtener un cliente por id.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Registrar un nuevo cliente (crea también su cuenta de usuario).' })
  create(@Body() dto: CreateClienteDto) {
    return this.clienteService.create(dto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @ApiOperation({ summary: 'Actualizar los datos de perfil de un cliente.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.clienteService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Eliminar un cliente y su cuenta de usuario asociada.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clienteService.remove(id);
  }
}
