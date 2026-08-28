import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipos_habitacion')
export class TiposHabitacion {
  @PrimaryGeneratedColumn({ name: 'id_tipos_habitacion' })
  id_tipos_habitacion: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_noche' })
  precio_noche: number;

  @Column({ type: 'int', default: 2, name: 'capacidad_maxima' })
  capacidad_maxima: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  servicios?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'imagen_url' })
  imagen_url?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
