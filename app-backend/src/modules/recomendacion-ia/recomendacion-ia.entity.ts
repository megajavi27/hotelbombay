import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Empleado } from '../empleado/empleado.entity';

export enum CategoriaRecomendacion {
  TURISTICO = 'TURISTICO',
  RESTAURANTE = 'RESTAURANTE',
  ENTRETENIMIENTO = 'ENTRETENIMIENTO',
  TRANSPORTE = 'TRANSPORTE',
  COMPRAS = 'COMPRAS',
  OTRO = 'OTRO',
}

@Entity('recomendacion_ia')
export class RecomendacionIa {
  @PrimaryGeneratedColumn({ name: 'id_recomendacion_ia' })
  id_recomendacion_ia: number;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'enum', enum: CategoriaRecomendacion })
  categoria: CategoriaRecomendacion;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ubicacion?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'distancia_km' })
  distancia_km?: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0.0 })
  calificacion?: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'imagen_url' })
  imagen_url?: string;

  @Column({ name: 'id_empleado', nullable: true })
  id_empleado?: number;

  @ManyToOne(() => Empleado, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  empleado?: Empleado;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;
}
