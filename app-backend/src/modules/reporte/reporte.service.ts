import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import moment from 'moment';
import puppeteer, { Browser } from 'puppeteer';
import { Pago, EstadoPago, MetodoPago } from '../pago/pago.entity';
import { Reserva, EstadoReserva } from '../reserva/reserva.entity';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Cliente } from '../cliente/cliente.entity';

// ─── Utilidades ───────────────────────────────────────────────────────────────

function fmt(val: any): string {
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(val: any): string {
  return val ? moment(val).format('DD/MM/YYYY') : '—';
}

function fmtDatetime(val: any): string {
  return val ? moment(val).format('DD/MM/YYYY HH:mm') : '—';
}

/**
 * Escapa caracteres especiales de HTML. Todo dato que provenga de la base de
 * datos y haya sido ingresado por un usuario (nombre, email, documento, teléfono,
 * número de habitación, etc.) debe pasar por aquí antes de interpolarse en el
 * HTML que se renderiza con Puppeteer, para evitar inyección de HTML/JS.
 */
function esc(val: unknown): string {
  if (val === null || val === undefined) return '—';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA_CREDITO: 'Tarjeta Crédito',
  TARJETA_DEBITO: 'Tarjeta Débito',
  TRANSFERENCIA: 'Transferencia',
  PAYPAL: 'PayPal',
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  CANCELADA: 'Cancelada',
};

// ─── CSS compartido ───────────────────────────────────────────────────────────

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }

  .page-header {
    background: #04162e;
    color: white;
    padding: 22px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .hotel-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
  .hotel-sub  { font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
  .report-title { font-size: 15px; font-weight: 600; margin-top: 6px; }
  .header-right { text-align: right; font-size: 10px; opacity: 0.75; line-height: 1.7; }
  .accent-line { width: 40px; height: 3px; background: #D4AF37; margin: 6px 0; }

  .content { padding: 22px 32px 32px; }

  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
  .kpi.accent { border-left: 4px solid #D4AF37; }
  .kpi-value { font-size: 22px; font-weight: 700; color: #04162e; line-height: 1.1; }
  .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; margin-top: 4px; }

  .section { margin-bottom: 24px; }
  .section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
    color: #475569; margin-bottom: 8px; padding-bottom: 6px;
    border-bottom: 2px solid #04162e;
    display: flex; justify-content: space-between; align-items: center;
  }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #04162e; color: white; }
  thead th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #f1f5f9; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .tr-total td { font-weight: 700; background: #0f2a50 !important; color: white; }

  .text-right  { text-align: right; }
  .text-center { text-align: center; }
  .text-muted  { color: #94a3b8; }
  .font-mono   { font-family: monospace; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 600; }
  .badge-green  { background: #dcfce7; color: #166534; }
  .badge-blue   { background: #dbeafe; color: #1d4ed8; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red    { background: #fee2e2; color: #991b1b; }
  .badge-gray   { background: #f1f5f9; color: #475569; }
  .badge-gold   { background: #fef3c7; color: #78350f; }

  .page-footer {
    margin-top: 32px; padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between;
    font-size: 9px; color: #94a3b8;
  }
`;

// ─── Wrapper HTML ─────────────────────────────────────────────────────────────

function htmlDoc(titulo: string, subtitulo: string, desde: string | undefined, hasta: string | undefined, body: string): string {
  const periodo = desde && hasta
    ? `${moment(desde).format('DD/MM/YYYY')} — ${moment(hasta).format('DD/MM/YYYY')}`
    : 'Todos los registros';
  const ahora = moment().format('DD/MM/YYYY HH:mm');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS}</style>
  <title>Hotel Bombay — ${titulo}</title>
</head>
<body>
  <div class="page-header">
    <div>
      <div class="hotel-name">Hotel Bombay</div>
      <div class="hotel-sub">Sistema de Gestión Hotelera</div>
      <div class="accent-line"></div>
      <div class="report-title">${titulo}</div>
    </div>
    <div class="header-right">
      <div><strong>${subtitulo}</strong></div>
      <div>Período: ${periodo}</div>
      <div>Generado: ${ahora}</div>
    </div>
  </div>
  <div class="content">
    ${body}
    <div class="page-footer">
      <span>Hotel Bombay — Sistema de Gestión Interna</span>
      <span>${titulo} · ${ahora}</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── Puppeteer → PDF ──────────────────────────────────────────────────────────

@Injectable()
export class ReporteService {
  private readonly logger = new Logger(ReporteService.name);

  constructor(
    @InjectRepository(Pago)       private readonly pagoRepo: Repository<Pago>,
    @InjectRepository(Reserva)    private readonly reservaRepo: Repository<Reserva>,
    @InjectRepository(Habitacion) private readonly habRepo: Repository<Habitacion>,
    @InjectRepository(Cliente)    private readonly clienteRepo: Repository<Cliente>,
  ) {}

  /**
   * Convierte el HTML del reporte en un PDF usando el Chrome de Puppeteer.
   *
   * Puppeteer descarga su propia copia de Chrome durante el `postinstall` del
   * paquete. Si ese script no llegó a ejecutarse —npm lo bloquea cuando el
   * proyecto usa una lista de `allowScripts`— el navegador no existe en disco y
   * `launch()` falla. Sin este try/catch el usuario solo veía "Error al generar
   * el reporte", que no dice qué hay que hacer para arreglarlo.
   */
  private async toPdf(html: string): Promise<Buffer> {
    let browser: Browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    } catch (error) {
      this.logger.error('No se pudo iniciar Chrome para generar el PDF.', error as Error);
      throw new ServiceUnavailableException(
        'No se pudo iniciar el navegador que genera los PDF. En la carpeta app-backend ejecuta: npx puppeteer browsers install chrome',
      );
    }

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // ── 1. REPORTE DE INGRESOS ─────────────────────────────────────────────────
  async generarVentas(desde?: string, hasta?: string): Promise<Buffer> {
    const qb = this.pagoRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.reserva', 'r')
      .leftJoinAndSelect('r.cliente', 'c')
      .leftJoinAndSelect('c.usuario', 'u')
      .leftJoinAndSelect('r.habitacion', 'h')
      .where('p.estado = :estado', { estado: EstadoPago.COMPLETADO });

    if (desde) qb.andWhere('p.fecha_pago >= :desde', { desde: moment(desde).startOf('day').toDate() });
    if (hasta) qb.andWhere('p.fecha_pago <= :hasta', { hasta: moment(hasta).endOf('day').toDate() });
    qb.orderBy('p.fecha_pago', 'DESC');
    const pagos = await qb.getMany();

    const total    = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const promedio = pagos.length > 0 ? total / pagos.length : 0;

    const byMetodo = new Map<string, { cant: number; total: number }>();
    for (const p of pagos) {
      const k = p.metodo_pago ?? 'SIN_MÉTODO';
      const e = byMetodo.get(k) ?? { cant: 0, total: 0 };
      byMetodo.set(k, { cant: e.cant + 1, total: e.total + Number(p.monto) });
    }

    const filaMetodo = Array.from(byMetodo.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([k, v]) => `
        <tr>
          <td>${METODO_LABEL[k] ?? k}</td>
          <td class="text-center">${v.cant}</td>
          <td class="text-right font-mono">${fmt(v.total)}</td>
        </tr>
      `).join('');

    const filaTx = pagos.map(p => {
      const nombre = p.reserva?.cliente?.usuario
        ? `${p.reserva.cliente.usuario.nombre} ${p.reserva.cliente.usuario.apellido}`
        : `Cliente #${p.reserva?.id_cliente ?? '—'}`;
      return `
        <tr>
          <td class="text-center text-muted">${p.id_pago}</td>
          <td>${fmtDatetime(p.fecha_pago)}</td>
          <td>${esc(nombre)}</td>
          <td class="text-center">${esc(p.reserva?.habitacion?.numero)}</td>
          <td>${esc(METODO_LABEL[p.metodo_pago ?? ''] ?? '—')}</td>
          <td class="text-right font-mono">${fmt(p.monto)}</td>
        </tr>`;
    }).join('');

    const body = `
      <div class="kpi-grid">
        <div class="kpi accent"><div class="kpi-value">${fmt(total)}</div><div class="kpi-label">Total Ingresos</div></div>
        <div class="kpi"><div class="kpi-value">${pagos.length}</div><div class="kpi-label">Transacciones</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(promedio)}</div><div class="kpi-label">Ticket Promedio</div></div>
      </div>

      <div class="section">
        <div class="section-title"><span>Por Método de Pago</span></div>
        <table>
          <thead><tr><th>Método</th><th class="text-center">Cantidad</th><th class="text-right">Total</th></tr></thead>
          <tbody>${filaMetodo}</tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title"><span>Detalle de Transacciones</span><span>${pagos.length} registros</span></div>
        <table>
          <thead>
            <tr><th>#</th><th>Fecha y Hora</th><th>Cliente</th><th>Hab.</th><th>Método</th><th class="text-right">Monto</th></tr>
          </thead>
          <tbody>
            ${filaTx}
            <tr class="tr-total">
              <td colspan="5">TOTAL PERÍODO</td>
              <td class="text-right font-mono">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    return this.toPdf(htmlDoc('Reporte de Ingresos', 'Pagos Completados', desde, hasta, body));
  }

  // ── 2. COBROS EN EFECTIVO ──────────────────────────────────────────────────
  async generarEfectivo(desde?: string, hasta?: string): Promise<Buffer> {
    const qb = this.pagoRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.reserva', 'r')
      .leftJoinAndSelect('r.cliente', 'c')
      .leftJoinAndSelect('c.usuario', 'u')
      .leftJoinAndSelect('r.habitacion', 'h')
      .where('p.estado = :estado', { estado: EstadoPago.COMPLETADO })
      .andWhere('p.metodo_pago = :metodo', { metodo: MetodoPago.EFECTIVO });

    if (desde) qb.andWhere('p.fecha_pago >= :desde', { desde: moment(desde).startOf('day').toDate() });
    if (hasta) qb.andWhere('p.fecha_pago <= :hasta', { hasta: moment(hasta).endOf('day').toDate() });
    qb.orderBy('p.fecha_pago', 'DESC');
    const pagos = await qb.getMany();

    const total    = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const promedio = pagos.length > 0 ? total / pagos.length : 0;

    const filas = pagos.map(p => {
      const u = p.reserva?.cliente?.usuario;
      const nombre = u ? `${u.nombre} ${u.apellido}` : `Cliente #${p.reserva?.id_cliente ?? '—'}`;
      return `
        <tr>
          <td class="text-center text-muted">${p.id_pago}</td>
          <td>${fmtDatetime(p.fecha_pago)}</td>
          <td>${esc(nombre)}</td>
          <td class="text-muted">${esc(u?.numero_documento)}</td>
          <td class="text-center">${esc(p.reserva?.habitacion?.numero)}</td>
          <td class="text-center text-muted">#${p.reserva?.id_reserva ?? '—'}</td>
          <td class="text-right font-mono">${fmt(p.monto)}</td>
        </tr>`;
    }).join('');

    const body = `
      <div class="kpi-grid">
        <div class="kpi accent"><div class="kpi-value">${fmt(total)}</div><div class="kpi-label">Total Efectivo</div></div>
        <div class="kpi"><div class="kpi-value">${pagos.length}</div><div class="kpi-label">Cobros Realizados</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(promedio)}</div><div class="kpi-label">Promedio por Cobro</div></div>
      </div>

      <div class="section">
        <div class="section-title"><span>Registro de Cobros en Efectivo</span><span>${pagos.length} registros</span></div>
        <table>
          <thead>
            <tr><th>#Pago</th><th>Fecha y Hora</th><th>Cliente</th><th>Documento</th><th>Hab.</th><th>Reserva</th><th class="text-right">Monto</th></tr>
          </thead>
          <tbody>
            ${filas || '<tr><td colspan="7" class="text-center text-muted" style="padding:20px">No hay cobros en efectivo en este período</td></tr>'}
            <tr class="tr-total">
              <td colspan="6">TOTAL EFECTIVO</td>
              <td class="text-right font-mono">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    return this.toPdf(htmlDoc('Cobros en Efectivo', 'Pagos con método Efectivo', desde, hasta, body));
  }

  // ── 3. HABITACIONES OCUPADAS ───────────────────────────────────────────────
  async generarOcupacion(): Promise<Buffer> {
    const [reservasCheckin, totalHabs] = await Promise.all([
      this.reservaRepo.createQueryBuilder('r')
        .leftJoinAndSelect('r.cliente', 'c')
        .leftJoinAndSelect('c.usuario', 'u')
        .leftJoinAndSelect('r.habitacion', 'h')
        .leftJoinAndSelect('h.tipoHabitacion', 'th')
        .where('r.estado = :estado', { estado: EstadoReserva.CHECKIN })
        .orderBy('r.fecha_inicio', 'ASC')
        .getMany(),
      this.habRepo.count(),
    ]);

    const tasaOcupacion = totalHabs > 0 ? Math.round((reservasCheckin.length / totalHabs) * 100) : 0;
    const huespedesTotales = reservasCheckin.reduce((s, r) => s + r.numero_huespedes, 0);

    const filas = reservasCheckin.map(r => {
      const u = r.cliente?.usuario;
      const noches = moment(r.fecha_fin).diff(moment(r.fecha_inicio), 'days');
      const nombre = u ? `${u.nombre} ${u.apellido}` : `Cliente #${r.id_cliente}`;
      return `
        <tr>
          <td class="text-center font-mono" style="font-weight:600">${esc(r.habitacion?.numero)}</td>
          <td>${esc(r.habitacion?.tipoHabitacion?.nombre)}</td>
          <td>${esc(nombre)}</td>
          <td class="text-muted">${esc(u?.numero_documento)}</td>
          <td>${fmtDate(r.fecha_inicio)}</td>
          <td>${fmtDate(r.fecha_fin)}</td>
          <td class="text-center">${r.numero_huespedes}</td>
          <td class="text-center">${noches}</td>
          <td class="text-right font-mono">${fmt(r.total)}</td>
        </tr>`;
    }).join('');

    const body = `
      <div class="kpi-grid">
        <div class="kpi accent"><div class="kpi-value">${reservasCheckin.length}</div><div class="kpi-label">Hab. Ocupadas</div></div>
        <div class="kpi"><div class="kpi-value">${totalHabs}</div><div class="kpi-label">Total Habitaciones</div></div>
        <div class="kpi"><div class="kpi-value">${tasaOcupacion}%</div><div class="kpi-label">Tasa de Ocupación</div></div>
        <div class="kpi"><div class="kpi-value">${huespedesTotales}</div><div class="kpi-label">Huéspedes Activos</div></div>
      </div>

      <div class="section">
        <div class="section-title"><span>Habitaciones con Check-in Activo</span><span>Al ${moment().format('DD/MM/YYYY HH:mm')}</span></div>
        <table>
          <thead>
            <tr>
              <th>Hab.</th><th>Tipo</th><th>Huésped</th><th>Documento</th>
              <th>Check-in</th><th>Check-out</th><th class="text-center">Huésp.</th><th class="text-center">Noches</th><th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filas || '<tr><td colspan="9" class="text-center text-muted" style="padding:20px">No hay habitaciones ocupadas actualmente</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.toPdf(htmlDoc('Habitaciones Ocupadas', 'Snapshot de ocupación actual', undefined, undefined, body));
  }

  // ── 4. REPORTE DE RESERVAS ─────────────────────────────────────────────────
  async generarReservas(desde?: string, hasta?: string, estado?: string): Promise<Buffer> {
    const qb = this.reservaRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.cliente', 'c')
      .leftJoinAndSelect('c.usuario', 'u')
      .leftJoinAndSelect('r.habitacion', 'h')
      .leftJoinAndSelect('h.tipoHabitacion', 'th')
      .orderBy('r.id_reserva', 'DESC');

    if (desde) qb.andWhere('r.fecha_inicio >= :desde', { desde });
    if (hasta) qb.andWhere('r.fecha_fin <= :hasta', { hasta });
    if (estado) qb.andWhere('r.estado = :estado', { estado });

    const reservas = await qb.getMany();

    const totalIngreso = reservas
      .filter(r => r.estado !== EstadoReserva.CANCELADA)
      .reduce((s, r) => s + Number(r.total), 0);

    const byEstado = new Map<string, number>();
    for (const r of reservas) {
      byEstado.set(r.estado, (byEstado.get(r.estado) ?? 0) + 1);
    }

    const estadoBadge: Record<string, string> = {
      PENDIENTE: 'badge-yellow', CONFIRMADA: 'badge-blue',
      CHECKIN: 'badge-green', CHECKOUT: 'badge-gray', CANCELADA: 'badge-red',
    };

    const kpiEstados = Array.from(byEstado.entries()).map(([k, v]) => `
      <div class="kpi"><div class="kpi-value">${v}</div><div class="kpi-label">${ESTADO_LABEL[k] ?? k}</div></div>
    `).join('');

    const filas = reservas.map(r => {
      const u = r.cliente?.usuario;
      const nombre = u ? `${u.nombre} ${u.apellido}` : `Cliente #${r.id_cliente}`;
      return `
        <tr>
          <td class="text-center text-muted">${r.id_reserva}</td>
          <td>${esc(nombre)}</td>
          <td class="text-center">${esc(r.habitacion?.numero)}</td>
          <td class="text-muted" style="font-size:9px">${esc(r.habitacion?.tipoHabitacion?.nombre)}</td>
          <td>${fmtDate(r.fecha_inicio)}</td>
          <td>${fmtDate(r.fecha_fin)}</td>
          <td class="text-center">${r.numero_huespedes}</td>
          <td class="text-center"><span class="badge ${estadoBadge[r.estado] ?? 'badge-gray'}">${esc(ESTADO_LABEL[r.estado] ?? r.estado)}</span></td>
          <td class="text-right font-mono">${fmt(r.total)}</td>
        </tr>`;
    }).join('');

    const body = `
      <div class="kpi-grid">
        <div class="kpi accent"><div class="kpi-value">${reservas.length}</div><div class="kpi-label">Total Reservas</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(totalIngreso)}</div><div class="kpi-label">Valor Total</div></div>
        ${kpiEstados}
      </div>

      <div class="section">
        <div class="section-title"><span>Listado de Reservas</span><span>${reservas.length} registros</span></div>
        <table>
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Hab.</th><th>Tipo</th><th>Check-in</th><th>Check-out</th><th class="text-center">Huésp.</th><th>Estado</th><th class="text-right">Total</th></tr>
          </thead>
          <tbody>
            ${filas || '<tr><td colspan="9" class="text-center text-muted" style="padding:20px">No se encontraron reservas</td></tr>'}
            <tr class="tr-total">
              <td colspan="8">TOTAL (sin canceladas)</td>
              <td class="text-right font-mono">${fmt(totalIngreso)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    return this.toPdf(htmlDoc('Reporte de Reservas', estado ? `Estado: ${ESTADO_LABEL[estado] ?? estado}` : 'Todas las reservas', desde, hasta, body));
  }

  // ── 5. RESUMEN DE CLIENTES ─────────────────────────────────────────────────
  async generarClientes(): Promise<Buffer> {
    const clientes = await this.clienteRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.usuario', 'u')
      .orderBy('c.id_cliente', 'DESC')
      .getMany();

    // Estadísticas de reservas por cliente
    const statsRaw = await this.reservaRepo.createQueryBuilder('r')
      .select('r.id_cliente', 'id_cliente')
      .addSelect('COUNT(r.id_reserva)', 'total_reservas')
      .addSelect('SUM(CASE WHEN r.estado != :cancelada THEN r.total ELSE 0 END)', 'total_gastado')
      .setParameter('cancelada', EstadoReserva.CANCELADA)
      .groupBy('r.id_cliente')
      .getRawMany();

    const statsMap = new Map<number, { total_reservas: number; total_gastado: number }>();
    for (const s of statsRaw) {
      statsMap.set(Number(s.id_cliente), {
        total_reservas: Number(s.total_reservas),
        total_gastado: Number(s.total_gastado),
      });
    }

    const clientesOrdenados = clientes
      .map(c => ({ ...c, stats: statsMap.get(c.id_cliente) ?? { total_reservas: 0, total_gastado: 0 } }))
      .sort((a, b) => b.stats.total_reservas - a.stats.total_reservas);

    const totalActivos    = clientes.filter(c => c.activo).length;
    const conReservas     = clientesOrdenados.filter(c => c.stats.total_reservas > 0).length;
    const totalIngresos   = clientesOrdenados.reduce((s, c) => s + c.stats.total_gastado, 0);

    const filas = clientesOrdenados.map(c => {
      const u = c.usuario;
      const activoBadge = c.activo ? 'badge-green' : 'badge-red';
      const activoLabel = c.activo ? 'Activo' : 'Inactivo';
      const nombre = u ? `${u.nombre} ${u.apellido}` : `—`;
      return `
        <tr>
          <td>${esc(nombre)}</td>
          <td class="text-muted">${esc(u?.numero_documento)}</td>
          <td class="text-muted" style="font-size:9px">${esc(u?.email)}</td>
          <td class="text-muted">${esc(u?.telefono)}</td>
          <td class="text-center font-mono" style="font-weight:600">${c.stats.total_reservas}</td>
          <td class="text-right font-mono">${fmt(c.stats.total_gastado)}</td>
          <td class="text-center"><span class="badge ${activoBadge}">${activoLabel}</span></td>
        </tr>`;
    }).join('');

    const body = `
      <div class="kpi-grid">
        <div class="kpi accent"><div class="kpi-value">${clientes.length}</div><div class="kpi-label">Total Clientes</div></div>
        <div class="kpi"><div class="kpi-value">${totalActivos}</div><div class="kpi-label">Activos</div></div>
        <div class="kpi"><div class="kpi-value">${conReservas}</div><div class="kpi-label">Con Reservas</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(totalIngresos)}</div><div class="kpi-label">Ingresos Totales</div></div>
      </div>

      <div class="section">
        <div class="section-title"><span>Clientes Registrados (por actividad)</span><span>${clientes.length} registros</span></div>
        <table>
          <thead>
            <tr><th>Nombre</th><th>Documento</th><th>Email</th><th>Teléfono</th><th class="text-center">Reservas</th><th class="text-right">Total Gastado</th><th>Estado</th></tr>
          </thead>
          <tbody>
            ${filas || '<tr><td colspan="7" class="text-center text-muted" style="padding:20px">No hay clientes registrados</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    return this.toPdf(htmlDoc('Resumen de Clientes', 'Todos los clientes registrados', undefined, undefined, body));
  }
}
