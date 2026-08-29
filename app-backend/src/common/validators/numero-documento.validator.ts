import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

/**
 * Longitud exacta según el tipo de documento.
 *
 * La cédula ecuatoriana tiene 10 dígitos y el RUC 13 (los 10 de la cédula más
 * el "001" del establecimiento). El pasaporte no tiene un formato universal, así
 * que solo se le aplica el tope de la columna.
 */
const LONGITUD_EXACTA: Record<string, number> = {
  CEDULA: 10,
  RUC: 13,
};

/** Ancho de `usuario.numero_documento` en la base de datos: VARCHAR(20). */
const MAX_DOCUMENTO = 20;

/**
 * Comprueba que el número de documento corresponda al tipo elegido.
 *
 * El `maxlength` del formulario evita el error de tecleo, pero no protege de
 * nada más: una petición hecha con Swagger o Postman se lo salta sin esfuerzo.
 * Esta validación es la que de verdad impide que entren cédulas de 7 dígitos.
 *
 * Lee `tipo_documento` del mismo objeto que se está validando; si no viene, se
 * asume CEDULA, que es el valor por defecto de la entidad.
 */
export function EsNumeroDocumento(opciones?: ValidationOptions) {
  return function (objetivo: object, propiedad: string) {
    registerDecorator({
      name: 'esNumeroDocumento',
      target: objetivo.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate(valor: unknown, args: ValidationArguments): boolean {
          // Si está vacío, decide @IsNotEmpty o @IsOptional, no este validador.
          if (valor === undefined || valor === null || valor === '') return true;
          if (typeof valor !== 'string') return false;

          const texto = valor.trim();
          const tipo = (args.object as Record<string, unknown>)['tipo_documento'];
          const exacta = LONGITUD_EXACTA[typeof tipo === 'string' ? tipo : 'CEDULA'];

          if (!exacta) return texto.length > 0 && texto.length <= MAX_DOCUMENTO;
          return new RegExp(`^\\d{${exacta}}$`).test(texto);
        },

        defaultMessage(args: ValidationArguments): string {
          const tipo = (args.object as Record<string, unknown>)['tipo_documento'];
          const clave = typeof tipo === 'string' ? tipo : 'CEDULA';
          const exacta = LONGITUD_EXACTA[clave];

          if (!exacta) {
            return `El número de documento no puede superar los ${MAX_DOCUMENTO} caracteres.`;
          }
          const nombre = clave === 'RUC' ? 'El RUC' : 'La cédula';
          return `${nombre} debe tener exactamente ${exacta} dígitos numéricos.`;
        },
      },
    });
  };
}
