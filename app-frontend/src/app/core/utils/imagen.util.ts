import { environment } from '../environments/environment';

/**
 * Convierte la ruta de una imagen en una URL que el navegador pueda cargar.
 *
 * Las fotos que sube el hotel se guardan en el backend y llegan como rutas
 * relativas (`/uploads/habitacion/foto.jpg`), así que hay que anteponerles el
 * origen del backend. En cambio `tipos_habitacion.imagen_url` suele ser un
 * enlace externo (https://...), que debe usarse tal cual.
 */
export function resolverUrlImagen(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${environment.filesBaseUrl}${url}`;
}

/** Imagen de respaldo cuando no hay ninguna foto cargada. */
export const IMAGEN_HABITACION_DEFAULT =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80';
