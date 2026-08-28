/** Tipo de usuario autenticado — se deriva de la tabla relacionada (empleado / cliente), no de un campo rol. */
export type TipoUsuario = 'empleado' | 'cliente';

/** Alias de compatibilidad para los decoradores @Roles() existentes. */
export const Rol = {
  EMPLEADO: 'empleado' as TipoUsuario,
  CLIENTE: 'cliente' as TipoUsuario,
  /** Cualquier empleado puede ejecutar acciones "admin"; el frontend filtra por perfil. */
  ADMIN: 'empleado' as TipoUsuario,
} as const;
