/**
 * Automated Post-Meal ML Synchronization via node-cron
 * 
 * Executes recordSessionAttendance automatically when each meal window concludes:
 * - Breakfast: 09:00 AM (0 9 * * *)
 * - Lunch: 02:15 PM (15 14 * * *)
 * - Dinner: 09:00 PM (0 21 * * *)
 * 
 * Safely handles database updates in the background without needing an HTTP request.
 */

const cron = require('node-cron');
const path = require('path');
const {
  recordSessionAttendance,
  generateMealPrediction,
  getLatestPrediction,
  toDateString,
} = require('../utils/mlMetricUtility');
const store = require(path.resolve(__dirname, '../../../student/backend/store'));

async function syncMealAttendance(mealId, io) {
  try {
    const today = new Date();
    const dateStr = toDateString(today);
    console.log(`[CRON] Starting automated post-meal ML sync for ${mealId} on ${dateStr}...`);

    // Ensure a prediction exists in ml_predictions before recording attendance
    let prediction = getLatestPrediction(mealId, dateStr);
    if (!prediction || prediction.status !== 'pending') {
      console.log(`[CRON] No pending prediction for ${mealId} on ${dateStr}. Generating pre-meal prediction first...`);
      await generateMealPrediction({ mealId, date: today });
    }

    const result = await recordSessionAttendance({ mealId, date: today });
    console.log(`[CRON] Automated ML sync completed for ${mealId}:`, result);

    if (io) {
      io.emit('meal:concluded', result);
      io.emit('dashboard:stats_changed', store.getLiveStats());
    }
    return result;
  } catch (err) {
    console.error(`[CRON] Error during automated ML sync for ${mealId}:`, err.message);
  }
}

function initMealSyncCron(io) {
  // 1. Breakfast concludes at 9:00 AM (09:00)
  cron.schedule('0 9 * * *', () => {
    syncMealAttendance('breakfast', io);
  });

  // 2. Lunch concludes at 2:15 PM (14:15)
  cron.schedule('15 14 * * *', () => {
    syncMealAttendance('lunch', io);
  });

  // 3. Dinner concludes at 9:00 PM (21:00)
  cron.schedule('0 21 * * *', () => {
    syncMealAttendance('dinner', io);
  });

  console.log('[CRON] Automated post-meal ML synchronization scheduled: Breakfast (09:00), Lunch (14:15), Dinner (21:00)');
}

module.exports = {
  initMealSyncCron,
  syncMealAttendance,
};
