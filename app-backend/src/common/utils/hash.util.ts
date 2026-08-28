import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * Utilidad de hashing de contraseñas.
 *
 * Usa bcrypt (con salt aleatorio por usuario y factor de costo ajustable) para
 * todas las contraseñas nuevas. Se mantiene compatibilidad hacia atrás con los
 * hashes SHA-256 (sin salt) generados por versiones anteriores del proyecto:
 * `comparePassword` detecta el formato del hash almacenado y valida con el
 * algoritmo correspondiente, para no invalidar las cuentas ya existentes.
 */

const BCRYPT_ROUNDS = 10;

/** Un hash SHA-256 en hex mide siempre 64 caracteres; un hash bcrypt empieza con $2a$/$2b$/$2y$. */
function esHashLegadoSha256(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

function hashPasswordSha256(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function comparePassword(password: string, hash: string): boolean {
  if (esHashLegadoSha256(hash)) {
    return hashPasswordSha256(password) === hash;
  }
  return bcrypt.compareSync(password, hash);
}

/**
 * Hash de un token de un solo uso (recuperación de contraseña).
 *
 * Aquí sí se usa SHA-256 y no bcrypt, a propósito: el token es un valor
 * aleatorio de 256 bits, no una contraseña elegida por una persona, así que no
 * hay diccionario que atacar y no hace falta un algoritmo lento. Además, al ser
 * determinista permite buscar el registro por igualdad en la base de datos.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
