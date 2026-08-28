import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cliente } from '../cliente/cliente.entity';
import { Habitacion } from '../habitacion/habitacion.entity';
import { Empleado } from '../empleado/empleado.entity';

export enum EstadoReserva {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  CHECKIN = 'CHECKIN',
  CHECKOUT = 'CHECKOUT',
  CANCELADA = 'CANCELADA',
}

@Entity('reserva')
export class Reserva {
  @PrimaryGeneratedColumn({ name: 'id_reserva' })
  id_reserva: number;

  @Column({ name: 'id_cliente' })
  id_cliente: number;

  @ManyToOne(() => Cliente, { eager: true })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @Column({ name: 'id_habitacion' })
  id_habitacion: number;

  @ManyToOne(() => Habitacion, { eager: true })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion: Habitacion;

  @Column({ name: 'id_empleado', nullable: true })
  id_empleado?: number;

  @ManyToOne(() => Empleado, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  empleado?: Empleado;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fecha_inicio: string;

  @Column({ type: 'date', name: 'fecha_fin' })
  fecha_fin: string;

  @Column({ type: 'int', default: 1, name: 'numero_huespedes' })
  numero_huespedes: number;

  @Column({ type: 'enum', enum: EstadoReserva, default: EstadoReserva.PENDIENTE })
  estado: EstadoReserva;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;
}
