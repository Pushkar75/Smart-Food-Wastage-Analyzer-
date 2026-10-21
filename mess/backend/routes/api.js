const path = require('path');
const express = require('express');
const router = express.Router();
const mockData = require('../mockData');
const store = require(path.resolve(__dirname, '../../../student/backend/store'));

// Auth Login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'mess.admin@smartmess.demo' && password === 'Mess@123') {
    res.json({
      success: true,
      token: 'demo-jwt-token-12345',
      user: {
        name: mockData.mess.staffName,
        email: mockData.mess.email,
        role: mockData.mess.role,
        messName: mockData.mess.name
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Profile / Mess Info
router.get('/profile', (req, res) => {
  res.json(mockData.mess);
});

// Dashboard Summary (uses live DB stats from smartmess.db)
router.get('/dashboard/summary', (req, res) => {
  const liveStats = store.getLiveStats();
  res.json({
    currentMeal: liveStats.currentMeal,
    nextMeal: liveStats.nextMeal,
    fullDay: liveStats.fullDay,
    summary: liveStats.summary,
    recentActivity: mockData.recentActivity,
    notifications: mockData.notifications,
    meals: liveStats.meals
  });
});

// Today's Meals (uses live DB snapshot from smartmess.db)
router.get('/meals/today', (req, res) => {
  const snapshot = store.adminMealSnapshot();
  res.json(snapshot);
});

// Predictions
router.get('/predictions', (req, res) => {
  res.json(mockData.history);
});

// Attendance History
router.get('/attendance', (req, res) => {
  res.json(mockData.attendance);
});

// Analytics
router.get('/analytics', (req, res) => {
  res.json(mockData.analytics);
});

// Hardware bridge routes (delegated to store)
router.get('/hardware/status', (req, res) => {
  res.json(store.getHardwareStatus());
});

router.post('/hardware/mode', (req, res) => {
  const { mode } = req.body || {};
  if (!mode || (mode !== 'verify' && mode !== 'enroll')) {
    return res.status(400).json({ error: 'invalid_mode', message: "Mode must be 'verify' or 'enroll'." });
  }
  const updatedStatus = store.setHardwareMode(mode);
  return res.json({ status: 'success', message: `Hardware mode set to ${mode}`, ...updatedStatus });
});

router.post('/hardware/captured', (req, res) => {
  const { newFingerprintId, deviceId } = req.body || {};
  if (newFingerprintId === undefined || newFingerprintId === null) {
    return res.status(400).json({ error: 'missing_id', message: 'newFingerprintId is required.' });
  }
  const result = store.recordCapturedFingerprint(newFingerprintId);
  if (result.error) return res.status(400).json(result);

  return res.json({
    status: 'success',
    message: `New fingerprint ID ${result.fingerprintId} captured and ready to map.`,
    fingerprintId: result.fingerprintId,
    timestamp: new Date().toISOString(),
    deviceId: deviceId || 'ESP32_GATE',
  });
});

router.post('/hardware/enroll', (req, res) => {
  const { studentId, name, fingerprintId } = req.body || {};
  if (!studentId || !name || fingerprintId === undefined || fingerprintId === null) {
    return res.status(400).json({ error: 'missing_fields', message: 'studentId, name, and fingerprintId are all required for enrollment.' });
  }
  const normalizedStudentId = String(studentId).trim().toUpperCase();
  const trimmedName = String(name).trim();
  const parsedFpId = parseInt(fingerprintId, 10);
  if (isNaN(parsedFpId)) {
    return res.status(400).json({ error: 'invalid_fingerprint_id', message: 'fingerprintId must be an integer.' });
  }

  const result = store.enrollStudent({ studentId: normalizedStudentId, name: trimmedName, fingerprintId: parsedFpId });
  if (result.error === 'already_enrolled') {
    return res.status(400).json({ error: 'Student is already enrolled.' });
  }
  if (result.error) return res.status(400).json({ error: result.message || result.error });

  return res.json({
    status: 'success',
    message: `Fingerprint ID ${parsedFpId} successfully assigned to ${result.user.name} (${result.user.studentId || result.user.id}).`,
    user: result.user,
  });
});

module.exports = router;
