import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('perfil')
export class Perfil {
  @PrimaryGeneratedColumn({ name: 'id_perfil' })
  id_perfil: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
