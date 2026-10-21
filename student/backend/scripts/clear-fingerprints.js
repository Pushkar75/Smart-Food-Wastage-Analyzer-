/**
 * Clears ALL fingerprint_id values from the SQLite users table.
 * Sets fingerprint_id = NULL for all records so the system is ready
 * for a clean pilot launch with actual physical fingerprint sensor IDs.
 *
 * Usage: node scripts/clear-fingerprints.js
 */

const { db } = require('../db');

try {
  const checkStmt = db.prepare('SELECT id, name, student_id, fingerprint_id FROM users WHERE fingerprint_id IS NOT NULL');
  const beforeUsers = checkStmt.all();

  console.log('\n[clear-fingerprints] Found the following mapped fingerprints:');
  if (beforeUsers.length === 0) {
    console.log('  (None - all fingerprint IDs are already NULL)');
  } else {
    beforeUsers.forEach(u => {
      console.log(`  - Slot #${u.fingerprint_id}: ${u.name} (${u.student_id || u.id})`);
    });
  }

  const updateStmt = db.prepare('UPDATE users SET fingerprint_id = NULL');
  const result = updateStmt.run();

  console.log(`\n[clear-fingerprints] Successfully cleared ${result.changes} user fingerprint mappings.`);
  console.log('All student profiles now have fingerprint_id = NULL.');
  console.log('The database is completely clean for pilot enrollment starting from ID 1!\n');
} catch (err) {
  console.error('[clear-fingerprints] Error clearing fingerprints:', err.message);
  process.exit(1);
}
