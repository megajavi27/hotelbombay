import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

/**
 * Enlace de recuperación de contraseña.
 *
 * Guarda el hash SHA-256 del token, nunca el token en claro: el valor original
 * solo viaja dentro del correo que recibe el usuario. Así, si alguien leyera
 * esta tabla no podría usar los enlaces que estén pendientes.
 */
@Entity('password_reset')
export class PasswordReset {
  @PrimaryGeneratedColumn({ name: 'id_password_reset' })
  id_password_reset: number;

  @Column({ name: 'id_usuario' })
  id_usuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: Usuario;

  /** SHA-256 en hexadecimal del token enviado por correo. */
  @Column({ type: 'char', length: 64, name: 'token_hash' })
  token_hash: string;

  @Column({ type: 'datetime' })
  expira: Date;

  /** Fecha en que se consumió. Un token solo sirve una vez. */
  @Column({ type: 'datetime', nullable: true, name: 'usado_en' })
  usado_en?: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;
}
