import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Habitacion } from './habitacion.entity';

/**
 * Una foto de la galería de una habitación.
 *
 * `url` es la ruta pública del archivo (/uploads/habitacion/...), no la ruta en
 * disco: el archivo físico vive en app-backend/uploads/habitacion/ y lo sirve
 * main.ts como contenido estático.
 */
@Entity('habitacion_imagen')
export class HabitacionImagen {
  @PrimaryGeneratedColumn({ name: 'id_imagen' })
  id_imagen: number;

  @Column({ name: 'id_habitacion' })
  id_habitacion: number;

  @ManyToOne(() => Habitacion, (habitacion) => habitacion.imagenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_habitacion' })
  habitacion?: Habitacion;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  titulo?: string;

  /** Posición dentro de la galería (ascendente). */
  @Column({ type: 'int', default: 0 })
  orden: number;

  /** Foto principal: la miniatura que se muestra en los listados. Solo una por habitación. */
  @Column({ type: 'boolean', default: false, name: 'es_portada' })
  es_portada: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;
}
