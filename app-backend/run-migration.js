/**
 * Ejecutor de migraciones SQL
 * Uso:
 *   node run-migration.js          → corre TODAS las migraciones pendientes en orden
 *   node run-migration.js 002      → corre solo la migración 002_*.sql
 */
require('dotenv').config();
const mysql = require('mysql2');
const fs    = require('fs');
const path  = require('path');

const conn = mysql.createConnection({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'db_hotelbombay',
  multipleStatements: true,
});

const migrationsDir = path.join(__dirname, 'migrations');
const target = process.argv[2]; // ej. "002"

conn.connect(err => {
  if (err) { console.error('❌ No se pudo conectar:', err.message); process.exit(1); }
  console.log('✅ Conectado a', process.env.DB_DATABASE, '\n');

  let files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (target) {
    files = files.filter(f => f.startsWith(target));
    if (!files.length) { console.error(`❌ No se encontró migración "${target}"`); process.exit(1); }
  }

  let i = 0;
  const runNext = () => {
    if (i >= files.length) { console.log('\n✅ Todas las migraciones completadas.'); conn.end(); return; }
    const file = files[i++];
    const sql  = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`▶  Ejecutando ${file} ...`);
    conn.query(sql, (err2, results) => {
      if (err2) {
        if (err2.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ℹ️  Columna ya existe — se omite.`);
        } else {
          console.error(`   ❌ Error:`, err2.message);
          conn.end(); process.exit(1);
        }
      } else {
        // Si la última query fue un SELECT (verificación), imprimir resultado
        const last = Array.isArray(results) ? results[results.length - 1] : results;
        if (Array.isArray(last)) {
          console.log('   Resultado:');
          console.table(last);
        } else {
          console.log(`   ✅ affectedRows: ${last?.affectedRows ?? 0}`);
        }
      }
      runNext();
    });
  };

  runNext();
});
