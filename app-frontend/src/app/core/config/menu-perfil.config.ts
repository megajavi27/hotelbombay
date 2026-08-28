export interface NavItem {
  label: string;
  icon: string;
  route: string;
  modulo: string;
  grupo: string;
}

// ─── Ítems para empleados ──────────────────────────────────────────────────
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         icon: 'dashboard',        route: '/dashboard',         modulo: 'dashboard',        grupo: 'Principal'    },
  { label: 'Reservas',          icon: 'event_available',  route: '/reservas',          modulo: 'reservas',         grupo: 'Operaciones'  },
  { label: 'Pagos',             icon: 'payments',         route: '/pagos',             modulo: 'pagos',            grupo: 'Operaciones'  },
  { label: 'Habitaciones',      icon: 'meeting_room',     route: '/habitaciones',      modulo: 'habitaciones',     grupo: 'Operaciones'  },
  { label: 'Tipos Habitación',  icon: 'bed',              route: '/tipos-habitacion',  modulo: 'tipos-habitacion', grupo: 'Operaciones'  },
  { label: 'Clientes',          icon: 'groups',           route: '/clientes',          modulo: 'clientes',         grupo: 'Personas'     },
  { label: 'Empleados',         icon: 'badge',            route: '/empleados',         modulo: 'empleados',        grupo: 'Personas'     },
  { label: 'Usuarios',          icon: 'manage_accounts',  route: '/usuarios',          modulo: 'usuarios',         grupo: 'Personas'     },
  { label: 'Recomendaciones',   icon: 'smart_toy',        route: '/recomendaciones',   modulo: 'recomendaciones',  grupo: 'Experiencia'  },
  { label: 'Reportes',          icon: 'assessment',       route: '/reportes',          modulo: 'reportes',         grupo: 'Reportes'     },
];

// ─── Ítems para clientes (portal propio) ──────────────────────────────────
export const NAV_ITEMS_CLIENTE: NavItem[] = [
  { label: 'Inicio',            icon: 'home',             route: '/mi-inicio',         modulo: 'mi-inicio',        grupo: 'Principal'    },
  { label: 'Mis Reservas',      icon: 'event_available',  route: '/mis-reservas',      modulo: 'mis-reservas',     grupo: 'Mi Cuenta'    },
  { label: 'Mi Perfil',         icon: 'account_circle',   route: '/mi-perfil',         modulo: 'mi-perfil',        grupo: 'Mi Cuenta'    },
  { label: 'Recomendaciones',   icon: 'smart_toy',        route: '/recomendaciones',   modulo: 'recomendaciones',  grupo: 'Experiencia'  },
];

// ─── Módulos permitidos por perfil de empleado ────────────────────────────
export const MODULOS_POR_PERFIL: Record<string, string[]> = {
  'Administrador': ['dashboard','empleados','usuarios','clientes','habitaciones','tipos-habitacion','reservas','pagos','recomendaciones','reportes'],
  'Gerente':       ['dashboard','empleados','clientes','habitaciones','tipos-habitacion','reservas','pagos','recomendaciones','reportes'],
  'Recepcionista': ['dashboard','clientes','habitaciones','reservas','pagos','recomendaciones','reportes'],
  'Ama de llaves': ['dashboard','habitaciones'],
  'Limpieza':      ['dashboard','habitaciones'],
  'Mantenimiento': ['dashboard','habitaciones'],
  'Conserje':      ['dashboard','reservas','recomendaciones'],
  'Seguridad':     ['dashboard','habitaciones','reservas'],
};

export const MODULOS_CLIENTE = ['mi-inicio', 'mis-reservas', 'mi-perfil', 'recomendaciones'];

export function getModulosPermitidos(tipo: 'empleado' | 'cliente', perfil?: string): string[] {
  if (tipo === 'cliente') return MODULOS_CLIENTE;
  return MODULOS_POR_PERFIL[perfil ?? ''] ?? ['dashboard'];
}

export function getNavItems(tipo: 'empleado' | 'cliente'): NavItem[] {
  return tipo === 'cliente' ? NAV_ITEMS_CLIENTE : NAV_ITEMS;
}
