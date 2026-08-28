import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface ComprobantePagoData {
  email: string;
  nombreCliente: string;
  codigoComprobante: string;
  monto: number;
  fechaPago: string;
  habitacion: string;
  fechaInicio: string;
  fechaFin: string;
  ultimos4?: string;
  cuotas?: number;
}

export interface RecuperacionPasswordData {
  email: string;
  nombre: string;
  url: string;
  minutosVigencia: number;
}

const NAVY = '#04162e';
const DORADO = '#b58b2a';
const CREMA = '#fdf9f2';
const TEXTO = '#1b1c1c';
const GRIS = '#5b6069';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private remitente = 'Hotel Bombay <no-responder@hotelbombay.com>';
  private redirigirA?: string;

  constructor(private readonly config: ConfigService) { }

  onModuleInit() {
    this.redirigirA = this.config.get<string>('MAIL_REDIRECT_TO') || undefined;

    const nombreRemitente = this.config.get<string>('MAIL_FROM_NAME', 'Hotel Bombay');
    const direccionRemitente = this.config.get<string>('MAIL_FROM_ADDRESS');
    if (direccionRemitente) {
      this.remitente = `${nombreRemitente} <${direccionRemitente}>`;
    } else {
      this.remitente = this.config.get<string>('MAIL_FROM', this.remitente);
    }

    const token = this.config.get<string>('MAIL_TOKEN');
    const host = this.config.get<string>('MAIL_HOST');

    if (token) {
      this.configurarApiMailtrap(token);
    } else if (host) {
      this.configurarSmtp(host);
    } else {
      this.logger.warn(
        'Sin MAIL_TOKEN ni MAIL_HOST: los correos se registrarán en consola en lugar de enviarse.',
      );
      return;
    }

    if (this.redirigirA) {
      this.logger.warn(`Modo desarrollo: todos los correos se desviarán a ${this.redirigirA}.`);
    }
  }

  /** Producto "Email Sending" de Mailtrap, por API con token. */
  private configurarApiMailtrap(token: string) {
    let MailtrapTransport: (opciones: { token: string }) => nodemailer.Transport;
    try {
      // Carga diferida a propósito: quien use solo SMTP no debería estar
      // obligado a instalar este paquete para que compile el proyecto.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ({ MailtrapTransport } = require('mailtrap'));
    } catch {
      this.logger.error(
        'MAIL_TOKEN está definido pero falta el paquete "mailtrap". Ejecuta: npm i mailtrap',
      );
      return;
    }

    this.transporter = nodemailer.createTransport(MailtrapTransport({ token }));
    this.logger.log('Correo configurado con la API de Mailtrap (Email Sending).');
  }

  /** SMTP genérico: sandbox de Mailtrap, Gmail, etc. */
  private configurarSmtp(host: string) {
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('MAIL_PORT', '2525')),
      // El sandbox de Mailtrap usa STARTTLS en el 2525, no TLS directo.
      secure: this.config.get<string>('MAIL_SECURE', 'false') === 'true',
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
    this.logger.log(`Correo configurado por SMTP contra ${host}.`);
  }

  // ── Recuperación de contraseña ─────────────────────────────────────────────

  async sendRecuperacionPassword(data: RecuperacionPasswordData): Promise<void> {
    const asunto = 'Recupera tu contraseña — Hotel Bombay';
    const html = this.plantillaRecuperacion(data);
    const texto =
      `Hola ${data.nombre},\n\n` +
      `Recibimos una solicitud para restablecer la contraseña de tu cuenta en Hotel Bombay.\n\n` +
      `Abre este enlace para elegir una nueva contraseña:\n${data.url}\n\n` +
      `El enlace caduca en ${data.minutosVigencia} minutos y solo puede usarse una vez.\n\n` +
      `Si no fuiste tú, puedes ignorar este mensaje: tu contraseña no cambiará.`;

    await this.enviar(data.email, asunto, html, texto, () => {
      this.logger.log('━━━━━━━━━━ RECUPERACIÓN DE CONTRASEÑA ━━━━━━━━━━');
      this.logger.log(`Para:   ${data.email}`);
      this.logger.log(`Enlace: ${data.url}`);
      this.logger.log(`Caduca en ${data.minutosVigencia} minutos.`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  }

  // ── Comprobante de pago ────────────────────────────────────────────────────

  async sendComprobantePago(data: ComprobantePagoData): Promise<void> {
    const asunto = `Comprobante de pago ${data.codigoComprobante} — Hotel Bombay`;
    const html = this.plantillaComprobante(data);
    const texto =
      `Hola ${data.nombreCliente},\n\n` +
      `Registramos tu pago correctamente.\n\n` +
      `Código: ${data.codigoComprobante}\n` +
      `Monto: $${Number(data.monto).toFixed(2)}\n` +
      `Habitación: ${data.habitacion}\n` +
      `Entrada: ${data.fechaInicio}  ·  Salida: ${data.fechaFin}\n\n` +
      `¡Te esperamos!`;

    await this.enviar(data.email, asunto, html, texto, () => {
      this.logger.log('━━━━━━━━━━ COMPROBANTE DE PAGO ━━━━━━━━━━');
      this.logger.log(`Para:   ${data.email}`);
      this.logger.log(`Código: ${data.codigoComprobante}`);
      this.logger.log(`Monto:  $${Number(data.monto).toFixed(2)}`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  }

  // ── Interno ────────────────────────────────────────────────────────────────

  private async enviar(
    destinatarioReal: string,
    asunto: string,
    html: string,
    texto: string,
    registrarEnConsola: () => void,
  ): Promise<void> {
    if (!this.transporter) {
      registrarEnConsola();
      return;
    }

    const desviado = !!this.redirigirA && this.redirigirA !== destinatarioReal;
    const para = this.redirigirA ?? destinatarioReal;

    const info = await this.transporter.sendMail({
      from: this.remitente,
      to: para,
      subject: desviado ? `[para ${destinatarioReal}] ${asunto}` : asunto,
      text: desviado ? `(Correo dirigido a ${destinatarioReal})\n\n${texto}` : texto,
      html: desviado ? this.avisoDesvio(destinatarioReal) + html : html,
    });

    this.logger.log(
      desviado
        ? `Correo para ${destinatarioReal} desviado a ${para} (${info.messageId}).`
        : `Correo enviado a ${para} (${info.messageId}).`,
    );
  }

  /** Banda superior que deja claro a quién iba dirigido el correo desviado. */
  private avisoDesvio(destinatarioReal: string): string {
    return `<div style="background:#fff4d6;border-bottom:1px solid #e6d5a8;padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7a5c15;">
      Entorno de pruebas · este correo estaba dirigido a <strong>${this.esc(destinatarioReal)}</strong>
    </div>`;
  }

  private esc(valor: unknown): string {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private envoltorio(contenido: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:${CREMA};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td style="background:${NAVY};padding:28px 32px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#ffffff;">Hotel Bombay</div>
            <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8292b0;margin-top:4px;">Baños de Agua Santa · Ecuador</div>
          </td>
        </tr>
        <tr><td style="padding:32px;color:${TEXTO};font-size:15px;line-height:1.6;">${contenido}</td></tr>
        <tr>
          <td style="background:${CREMA};padding:18px 32px;color:${GRIS};font-size:12px;line-height:1.5;">
            Este es un mensaje automático, por favor no respondas a este correo.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private plantillaRecuperacion(data: RecuperacionPasswordData): string {
    return this.envoltorio(`
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;margin:0 0 16px;color:${NAVY};">
        Recupera tu contraseña
      </h1>
      <p style="margin:0 0 16px;">Hola ${this.esc(data.nombre)}:</p>
      <p style="margin:0 0 24px;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        Pulsa el botón para elegir una nueva.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr><td style="background:${NAVY};border-radius:12px;">
          <a href="${this.esc(data.url)}"
             style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">
            Restablecer contraseña
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:${GRIS};font-size:13px;">
        El enlace caduca en <strong style="color:${TEXTO};">${data.minutosVigencia} minutos</strong> y solo puede usarse una vez.
      </p>
      <p style="margin:0 0 20px;color:${GRIS};font-size:13px;">
        Si no fuiste tú quien lo solicitó, ignora este mensaje: tu contraseña no cambiará.
      </p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #e6e3de;color:${GRIS};font-size:12px;word-break:break-all;">
        ¿El botón no funciona? Copia esta dirección en tu navegador:<br>
        <span style="color:${DORADO};">${this.esc(data.url)}</span>
      </p>
    `);
  }

  private plantillaComprobante(data: ComprobantePagoData): string {
    const fila = (etiqueta: string, valor: string) => `
      <tr>
        <td style="padding:8px 0;color:${GRIS};font-size:13px;">${etiqueta}</td>
        <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:bold;color:${TEXTO};">${valor}</td>
      </tr>`;

    return this.envoltorio(`
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;margin:0 0 16px;color:${NAVY};">
        Pago confirmado
      </h1>
      <p style="margin:0 0 24px;">
        Hola ${this.esc(data.nombreCliente)}: registramos tu pago correctamente. Aquí tienes el detalle.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        ${fila('Código de comprobante', this.esc(data.codigoComprobante))}
        ${fila('Monto', '$' + Number(data.monto).toFixed(2))}
        ${fila('Habitación', this.esc(data.habitacion))}
        ${fila('Entrada', this.esc(data.fechaInicio))}
        ${fila('Salida', this.esc(data.fechaFin))}
        ${data.ultimos4 ? fila('Tarjeta', '**** ' + this.esc(data.ultimos4)) : ''}
        ${data.cuotas ? fila('Cuotas', String(data.cuotas)) : ''}
      </table>
      <p style="margin:0;color:${GRIS};font-size:13px;">
        Conserva este correo: el código de comprobante te será solicitado al hacer el check-in.
      </p>
    `);
  }
}
