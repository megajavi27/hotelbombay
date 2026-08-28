/**
 * Diagnóstico de la configuración de correo.
 *
 * Uso:  node verificar-correo.js
 *
 * Lee el .env, muestra qué está llegando (enmascarando la contraseña) e intenta
 * autenticarse contra el servidor SMTP. No envía ningún correo.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const { MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, MAIL_FROM, FRONTEND_URL } = process.env;

const enmascarar = (v) => {
  if (!v) return null;
  if (v.length <= 6) return '*'.repeat(v.length);
  return v.slice(0, 3) + '*'.repeat(Math.max(0, v.length - 6)) + v.slice(-3);
};

const linea = (etiqueta, valor, extra = '') =>
  console.log(`  ${etiqueta.padEnd(14)} ${valor === undefined || valor === null || valor === '' ? '(vacío)' : valor}${extra}`);

console.log('\n─── Variables leídas del .env ───────────────────────────────');
linea('MAIL_HOST', MAIL_HOST);
linea('MAIL_PORT', MAIL_PORT);
linea('MAIL_SECURE', MAIL_SECURE);
linea('MAIL_USER', enmascarar(MAIL_USER), MAIL_USER ? `   (${MAIL_USER.length} caracteres)` : '');
linea('MAIL_PASS', MAIL_PASS ? 'definida' : null, MAIL_PASS ? `   (${MAIL_PASS.length} caracteres)` : '');
linea('MAIL_FROM', MAIL_FROM);
linea('FRONTEND_URL', FRONTEND_URL);

console.log('\n─── Revisión previa ─────────────────────────────────────────');
const avisos = [];

if (!MAIL_HOST) {
  avisos.push('MAIL_HOST está vacío: el backend no intentará enviar nada, solo escribirá en consola.');
}
if (MAIL_USER === 'api') {
  avisos.push('MAIL_USER es "api": esas son las credenciales de Email SENDING, no del sandbox. Necesitas las de Email Testing.');
}
if (MAIL_HOST && MAIL_HOST.includes('live.smtp')) {
  avisos.push('MAIL_HOST apunta a live.smtp (envío real). Para pruebas debe ser sandbox.smtp.mailtrap.io.');
}
if (MAIL_USER && /^["'].*["']$/.test(MAIL_USER)) {
  avisos.push('MAIL_USER conserva las comillas dentro del valor. Quítalas.');
}
if (MAIL_PASS && /^["'].*["']$/.test(MAIL_PASS)) {
  avisos.push('MAIL_PASS conserva las comillas dentro del valor. Quítalas.');
}
if (MAIL_USER && MAIL_USER !== MAIL_USER.trim()) {
  avisos.push('MAIL_USER tiene espacios al principio o al final.');
}
if (MAIL_PASS && MAIL_PASS !== MAIL_PASS.trim()) {
  avisos.push('MAIL_PASS tiene espacios al principio o al final.');
}
if (MAIL_PASS && MAIL_PASS.length > 40) {
  avisos.push('MAIL_PASS es muy larga: parece un token de API y no la contraseña SMTP del sandbox.');
}

if (avisos.length === 0) {
  console.log('  Sin anomalías evidentes en el formato.');
} else {
  avisos.forEach((a) => console.log('  ⚠  ' + a));
}

if (!MAIL_HOST) {
  console.log('\nNada que probar sin MAIL_HOST.\n');
  process.exit(0);
}

console.log('\n─── Probando la conexión ────────────────────────────────────');
const transporte = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT || 2525),
  secure: MAIL_SECURE === 'true',
  auth: { user: MAIL_USER, pass: MAIL_PASS },
});

transporte
  .verify()
  .then(() => {
    console.log('  ✅  Conexión y autenticación correctas. El correo ya debería salir.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log(`  ❌  ${error.message}`);
    if (error.responseCode === 535 || error.code === 'EAUTH') {
      console.log('\n  El servidor respondió pero rechazó el usuario o la contraseña.');
      console.log('  Casi siempre es una de estas tres:');
      console.log('    1. Copiaste las credenciales de "Email Sending" en vez de "Email Testing".');
      console.log('       Ve a https://mailtrap.io/inboxes → My Inbox → Integrations → Nodemailer.');
      console.log('       Las buenas van junto a host: "sandbox.smtp.mailtrap.io".');
      console.log('    2. Copiaste el usuario de una bandeja y la contraseña de otra.');
      console.log('    3. Se coló un espacio o un salto de línea al pegar.');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('\n  No se pudo llegar al servidor: revisa el host, el puerto o tu conexión.');
    }
    console.log('');
    process.exit(1);
  });
