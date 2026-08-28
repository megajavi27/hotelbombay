import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { comparePassword, hashPassword, hashToken } from '../../common/utils/hash.util';
import { MailService } from '../../common/services/mail.service';
import { Usuario, TipoDocumento } from '../usuario/usuario.entity';
import { Cliente } from '../cliente/cliente.entity';
import { Empleado } from '../empleado/empleado.entity';
import { PasswordReset } from './password-reset.entity';
import { LoginDto } from './dto/login.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { AuthResponseDto, UsuarioAutenticadoDto } from './dto/auth-response.dto';

/** Minutos que un enlace de recuperación sigue siendo válido. */
const MINUTOS_VIGENCIA_RECUPERACION = 60;

/**
 * Respuesta única de "olvidé mi contraseña".
 *
 * Se devuelve el mismo mensaje exista o no la cuenta: si respondiéramos
 * distinto, cualquiera podría usar este endpoint para averiguar qué correos
 * están registrados en el hotel.
 */
const RESPUESTA_RECUPERACION = {
  mensaje: 'Si el correo está registrado recibirás instrucciones en breve.',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(PasswordReset)
    private readonly resetRepository: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ── RECUPERAR CONTRASEÑA ──────────────────────────────────────────────────

  /**
   * Genera un enlace de recuperación y lo envía por correo.
   *
   * El token viaja en claro únicamente dentro del correo; en la base se guarda
   * su hash. Cualquier enlace anterior que siguiera pendiente se elimina, para
   * que solo exista uno activo por usuario.
   */
  async olvidePassword(email: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { email } });
    if (!usuario) return RESPUESTA_RECUPERACION;

    await this.resetRepository.delete({ id_usuario: usuario.id_usuario, usado_en: IsNull() });

    const token = randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + MINUTOS_VIGENCIA_RECUPERACION * 60 * 1000);

    await this.resetRepository.save(
      this.resetRepository.create({
        id_usuario: usuario.id_usuario,
        token_hash: hashToken(token),
        expira,
      }),
    );

    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const url = `${base}/restablecer-password?token=${token}`;

    // Un fallo de correo no debe convertirse en un error para quien lo pidió:
    // el enlace ya está creado y la respuesta debe ser siempre la misma.
    try {
      await this.mailService.sendRecuperacionPassword({
        email: usuario.email,
        nombre: usuario.nombre,
        url,
        minutosVigencia: MINUTOS_VIGENCIA_RECUPERACION,
      });
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo de recuperación a ${usuario.email}.`, error as Error);
    }

    return RESPUESTA_RECUPERACION;
  }

  /**
   * Consume un enlace de recuperación y cambia la contraseña.
   *
   * El cambio de contraseña y el marcado del token se hacen en una transacción:
   * si algo fallara a mitad, el token no debe quedar consumido sin que la
   * contraseña haya cambiado.
   */
  async restablecerPassword(token: string, password: string): Promise<{ mensaje: string }> {
    const registro = await this.resetRepository.findOne({ where: { token_hash: hashToken(token) } });

    if (!registro || registro.usado_en) {
      throw new BadRequestException('El enlace de recuperación no es válido o ya fue utilizado.');
    }
    if (registro.expira.getTime() < Date.now()) {
      throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Usuario, registro.id_usuario, { password: hashPassword(password) });
      await manager.update(PasswordReset, registro.id_password_reset, { usado_en: new Date() });
    });

    return { mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  // ── REGISTRO CLIENTE ──────────────────────────────────────────────────────
  async registroCliente(dto: RegistroClienteDto): Promise<AuthResponseDto> {
    const emailExiste = await this.usuarioRepository.findOne({ where: { email: dto.email } });
    if (emailExiste) throw new BadRequestException('Ya existe una cuenta con ese correo electrónico.');

    const docExiste = await this.usuarioRepository.findOne({ where: { numero_documento: dto.numero_documento } });
    if (docExiste) throw new BadRequestException('Ya existe una cuenta con ese número de documento.');

    const usuario = this.usuarioRepository.create({
      nombre:           dto.nombre,
      apellido:         dto.apellido,
      email:            dto.email,
      password:         hashPassword(dto.password),
      tipo_documento:   dto.tipo_documento ?? TipoDocumento.CEDULA,
      numero_documento: dto.numero_documento,
      telefono:         dto.telefono,
      direccion:        dto.direccion,
    });
    const usuarioGuardado = await this.usuarioRepository.save(usuario);

    const cliente = this.clienteRepository.create({
      id_usuario:       usuarioGuardado.id_usuario,
      nacionalidad:     dto.nacionalidad,
      fecha_nacimiento: dto.fecha_nacimiento,
    });
    const clienteGuardado = await this.clienteRepository.save(cliente);

    const nombreCompleto = `${usuarioGuardado.nombre} ${usuarioGuardado.apellido}`;
    const accessToken = this.jwtService.sign({
      sub:        usuarioGuardado.id_usuario,
      email:      usuarioGuardado.email,
      tipo:       'cliente',
      id_cliente: clienteGuardado.id_cliente,
    });

    return {
      accessToken,
      usuario: {
        id_usuario:  usuarioGuardado.id_usuario,
        email:       usuarioGuardado.email,
        nombreCompleto,
        tipo:        'cliente',
        id_cliente:  clienteGuardado.id_cliente,
      },
    };
  }

  // ── LOGIN EMPLEADO ─────────────────────────────────────────────────────────
  async loginEmpleado(dto: LoginDto): Promise<AuthResponseDto> {
    const usuario = await this.usuarioRepository.findOne({ where: { email: dto.email } });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas.');

    const empleado = await this.empleadoRepository.findOne({
      where: { id_usuario: usuario.id_usuario },
      relations: { perfil: true },
    });
    if (!empleado) throw new UnauthorizedException('Este usuario no tiene perfil de empleado.');
    if (!empleado.activo) throw new UnauthorizedException('La cuenta de empleado se encuentra inactiva.');

    if (!comparePassword(dto.password, usuario.password))
      throw new UnauthorizedException('Credenciales inválidas.');

    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
    const perfilNombre   = empleado.perfil?.nombre ?? 'Empleado';

    const accessToken = this.jwtService.sign({
      sub:         usuario.id_usuario,
      email:       usuario.email,
      tipo:        'empleado',
      perfil:      perfilNombre,
      id_empleado: empleado.id_empleado,
    });

    return {
      accessToken,
      usuario: {
        id_usuario:  usuario.id_usuario,
        email:       usuario.email,
        nombreCompleto,
        tipo:        'empleado',
        perfil:      perfilNombre,
        id_empleado: empleado.id_empleado,
      },
    };
  }

  // ── LOGIN CLIENTE ──────────────────────────────────────────────────────────
  async loginCliente(dto: LoginDto): Promise<AuthResponseDto> {
    const usuario = await this.usuarioRepository.findOne({ where: { email: dto.email } });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas.');

    const cliente = await this.clienteRepository.findOne({
      where: { id_usuario: usuario.id_usuario },
    });
    if (!cliente) throw new UnauthorizedException('Este usuario no tiene perfil de cliente.');
    if (!cliente.activo) throw new UnauthorizedException('La cuenta de cliente se encuentra inactiva.');

    if (!comparePassword(dto.password, usuario.password))
      throw new UnauthorizedException('Credenciales inválidas.');

    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

    const accessToken = this.jwtService.sign({
      sub:        usuario.id_usuario,
      email:      usuario.email,
      tipo:       'cliente',
      id_cliente: cliente.id_cliente,
    });

    return {
      accessToken,
      usuario: {
        id_usuario:  usuario.id_usuario,
        email:       usuario.email,
        nombreCompleto,
        tipo:        'cliente',
        id_cliente:  cliente.id_cliente,
      },
    };
  }

  // ── ME ─────────────────────────────────────────────────────────────────────
  async me(id_usuario: number, tipo: string): Promise<UsuarioAutenticadoDto> {
    const usuario = await this.usuarioRepository.findOne({ where: { id_usuario } });
    if (!usuario) throw new UnauthorizedException('Sesión inválida.');

    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

    if (tipo === 'cliente') {
      const cliente = await this.clienteRepository.findOne({ where: { id_usuario } });
      if (!cliente) throw new UnauthorizedException('Sesión inválida: perfil de cliente no encontrado.');
      return {
        id_usuario,
        email: usuario.email,
        nombreCompleto,
        tipo:       'cliente',
        id_cliente: cliente.id_cliente,
      };
    }

    const empleado = await this.empleadoRepository.findOne({
      where: { id_usuario },
      relations: { perfil: true },
    });
    if (!empleado) throw new UnauthorizedException('Sesión inválida: perfil de empleado no encontrado.');
    return {
      id_usuario,
      email: usuario.email,
      nombreCompleto,
      tipo:        'empleado',
      perfil:      empleado.perfil?.nombre ?? 'Empleado',
      id_empleado: empleado.id_empleado,
    };
  }
}
