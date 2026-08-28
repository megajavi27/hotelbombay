import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { OlvidePasswordDto } from './dto/olvide-password.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('olvide-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña (público).' })
  olvidePassword(@Body() dto: OlvidePasswordDto) {
    return this.authService.olvidePassword(dto.email);
  }

  @Post('restablecer-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con el token del correo (público).' })
  restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.authService.restablecerPassword(dto.token, dto.password);
  }

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de nuevo cliente (público).' })
  registroCliente(@Body() dto: RegistroClienteDto) {
    return this.authService.registroCliente(dto);
  }

  @Post('login/empleado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión como empleado.' })
  loginEmpleado(@Body() dto: LoginDto) {
    return this.authService.loginEmpleado(dto);
  }

  @Post('login/cliente')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión como cliente.' })
  loginCliente(@Body() dto: LoginDto) {
    return this.authService.loginCliente(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Datos del usuario autenticado.' })
  me(@CurrentUser() user: any) {
    return this.authService.me(user.id_usuario, user.tipo);
  }
}
