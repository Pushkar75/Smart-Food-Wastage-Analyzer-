/**
 * Resets today's attendance records in SQLite so hardware scan testing can be
 * performed fresh without pre-existing duplicate scan conflicts.
 *
 * Usage: npm run db:reset-today
 */

const { db } = require('../db');
const { toDateKey } = require('../store');

const todayKey = toDateKey(new Date());

try {
  const stmt = db.prepare('DELETE FROM attendance WHERE meal_date = ?');
  const result = stmt.run(todayKey);
  console.log(`\n[db:reset-today] Successfully cleared ${result.changes} attendance records for today (${todayKey}).`);
  console.log('You can now run fresh ESP32 hardware scan tests cleanly!\n');
} catch (err) {
  console.error('[db:reset-today] Error resetting attendance:', err.message);
  process.exit(1);
}
