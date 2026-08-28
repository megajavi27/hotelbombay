import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Reserva } from '../reserva/reserva.entity';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  PAYPAL = 'PAYPAL',
}

export enum EstadoPago {
  PENDIENTE           = 'PENDIENTE',
  PENDIENTE_REVISION  = 'PENDIENTE_REVISION',
  COMPLETADO          = 'COMPLETADO',
  RECHAZADO           = 'RECHAZADO',
  REEMBOLSADO         = 'REEMBOLSADO',
}

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn({ name: 'id_pago' })
  id_pago: number;

  @Column({ name: 'id_reserva' })
  id_reserva: number;

  @ManyToOne(() => Reserva, { eager: true })
  @JoinColumn({ name: 'id_reserva' })
  reserva: Reserva;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'enum', enum: MetodoPago, name: 'metodo_pago', nullable: true, default: null })
  metodo_pago?: MetodoPago;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  estado: EstadoPago;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'comprobante_url' })
  comprobante_url?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'motivo_rechazo' })
  motivo_rechazo?: string;

  @CreateDateColumn({ name: 'fecha_pago' })
  fecha_pago: Date;
}
