import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TiposHabitacion } from '../tipos-habitacion/tipos-habitacion.entity';
import { HabitacionImagen } from './habitacion-imagen.entity';

export enum EstadoHabitacion {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADA = 'OCUPADA',
  MANTENIMIENTO = 'MANTENIMIENTO',
  LIMPIEZA = 'LIMPIEZA',
}

@Entity('habitacion')
export class Habitacion {
  @PrimaryGeneratedColumn({ name: 'id_habitacion' })
  id_habitacion: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  numero: string;

  @Column({ type: 'int', nullable: true })
  piso?: number;

  @Column({ name: 'id_tipos_habitacion' })
  id_tipos_habitacion: number;

  @ManyToOne(() => TiposHabitacion, { eager: true })
  @JoinColumn({ name: 'id_tipos_habitacion' })
  tipoHabitacion: TiposHabitacion;

  @Column({ type: 'enum', enum: EstadoHabitacion, default: EstadoHabitacion.DISPONIBLE })
  estado: EstadoHabitacion;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observaciones?: string;

  /**
   * Galería de fotos. No es eager a propósito: Reserva carga Habitacion de forma
   * eager, y si las imágenes lo fueran también viajarían en cada listado de
   * reservas y pagos sin que nadie las use. Se piden explícitamente con
   * `relations: { imagenes: true }` donde hacen falta.
   */
  @OneToMany(() => HabitacionImagen, (imagen) => imagen.habitacion)
  imagenes?: HabitacionImagen[];
}
