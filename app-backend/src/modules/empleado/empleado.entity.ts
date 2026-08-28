import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Perfil } from '../perfil/perfil.entity';

@Entity('empleado')
export class Empleado {
  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  id_empleado: number;

  @Column({ name: 'id_usuario' })
  id_usuario: number;

  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'id_perfil', nullable: true })
  id_perfil: number | null;

  @ManyToOne(() => Perfil, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_perfil' })
  perfil: Perfil | null;

  @Column({ type: 'date', nullable: true, name: 'fecha_contratacion' })
  fecha_contratacion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salario?: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;
}
