const path = require('path');
const express = require('express');
const router = express.Router();
const mockData = require('../mockData');
const store = require(path.resolve(__dirname, '../../../student/backend/store'));
const {
  generateOtp,
  sendOtpEmail,
  storeOtp,
  verifyOtp,
  determineRole,
  issueToken,
  storePendingRegistration,
  getPendingRegistration,
  clearPendingRegistration,
} = require('../otpService');

/**
 * POST /api/auth/register-request
 * Body: { name, email, role, hostel, studentId/regNo }
 */
router.post('/auth/register-request', async (req, res) => {
  const { name, email, role, hostel, studentId, regNo } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@vitap.ac.in') && !normalizedEmail.endsWith('@vitapstudent.ac.in')) {
    return res.status(403).json({ error: 'email doesnt belong to VIT-AP' });
  }

  // Check if account already exists
  const existingUser = store.getUserByEmail ? store.getUserByEmail(normalizedEmail) : store.findUserForLogin(normalizedEmail);
  if (existingUser && (existingUser.id || existingUser.user)) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const cleanRole = role === 'student' ? 'student' : 'admin';
  const effectiveHostel = hostel ? String(hostel).trim() : 'MH-1';

  const regData = {
    name: String(name).trim(),
    email: normalizedEmail,
    role: cleanRole,
    hostel: effectiveHostel,
    studentId: (studentId || regNo) ? String(studentId || regNo).trim().toUpperCase() : null,
  };

  storePendingRegistration(normalizedEmail, regData);

  const otp = generateOtp();
  storeOtp(normalizedEmail, otp);
  await sendOtpEmail(normalizedEmail, otp);

  return res.json({
    success: true,
    message: 'Verification OTP sent to your college email.',
  });
});

/**
 * POST /api/auth/register-verify
 * Body: { email: string, otp: string }
 */
router.post('/auth/register-verify', (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedOtp = String(otp).trim();

  const verification = verifyOtp(normalizedEmail, trimmedOtp);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }

  const pending = getPendingRegistration(normalizedEmail);
  if (!pending) {
    return res.status(400).json({ error: 'Registration session expired or not found. Please sign up again.' });
  }

  clearPendingRegistration(normalizedEmail);

  let newUser;
  try {
    newUser = store.registerUser({
      role: pending.role,
      name: pending.name,
      email: pending.email,
      studentId: pending.studentId,
      hostel: pending.hostel,
    });
  } catch (err) {
    console.error('[AUTH] Failed to save registered user:', err);
    return res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }

  const payload = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    hostel: newUser.hostel || null,
    studentId: newUser.studentId || null,
    regNo: newUser.studentId || null,
  };

  const token = issueToken(payload);

  try {
    store.createSession(token, newUser.id);
  } catch (err) {}

  return res.json({
    success: true,
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      hostel: newUser.hostel || null,
      studentId: newUser.studentId || null,
      regNo: newUser.studentId || null,
      messName: newUser.mess || (newUser.hostel ? `Mess - ${newUser.hostel}` : mockData.mess.name),
    },
  });
});

/**
 * POST /api/auth/request-otp (Login Flow)
 * Body: { email: string }
 * Strictly checks that email ends with @vitap.ac.in or @vitapstudent.ac.in.
 * If account not found: returns 404 {"error": "Account not found. Please sign up first."}.
 * Strictly conceals OTP from JSON response.
 */
router.post('/auth/request-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@vitap.ac.in') && !normalizedEmail.endsWith('@vitapstudent.ac.in')) {
    return res.status(403).json({ error: 'email doesnt belong to VIT-AP' });
  }

  const user = store.getUserByEmail ? store.getUserByEmail(normalizedEmail) : null;
  const legacyFound = !user && store.findUserForLogin ? store.findUserForLogin(normalizedEmail) : null;
  const existingUser = user || legacyFound?.user;

  if (!existingUser) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' });
  }

  const otp = generateOtp();
  storeOtp(normalizedEmail, otp);
  await sendOtpEmail(normalizedEmail, otp);

  return res.json({
    success: true,
    message: 'OTP sent successfully to your VIT-AP email address.',
  });
});

/**
 * POST /api/auth/verify-otp (Login Flow)
 * Body: { email: string, otp: string }
 */
router.post('/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedOtp = String(otp).trim();

  const verification = verifyOtp(normalizedEmail, trimmedOtp);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }

  let user = store.getUserByEmail ? store.getUserByEmail(normalizedEmail) : null;
  if (!user && store.findUserForLogin) {
    const found = store.findUserForLogin(normalizedEmail);
    user = found?.user;
  }

  if (!user) {
    return res.status(404).json({ error: 'Account not found. Please sign up first.' });
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hostel: user.hostel || null,
    studentId: user.studentId || user.regNo || null,
    regNo: user.studentId || user.regNo || null,
  };

  const token = issueToken(payload);

  try {
    store.createSession(token, user.id);
  } catch (err) {}

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hostel: user.hostel || null,
      studentId: user.studentId || user.regNo || null,
      regNo: user.studentId || user.regNo || null,
      messName: user.mess || (user.hostel ? `Mess - ${user.hostel}` : mockData.mess.name),
    },
  });
});

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
  const io = req.app.get('io');
  if (io) io.emit('hardware:mode_changed', updatedStatus);
  return res.json({ status: 'success', message: `Hardware mode set to ${mode}`, ...updatedStatus });
});

router.post('/hardware/captured', (req, res) => {
  const { newFingerprintId, deviceId } = req.body || {};
  if (newFingerprintId === undefined || newFingerprintId === null) {
    return res.status(400).json({ error: 'missing_id', message: 'newFingerprintId is required.' });
  }
  const result = store.recordCapturedFingerprint(newFingerprintId);
  if (result.error) return res.status(400).json(result);

  const payload = {
    fingerprintId: result.fingerprintId,
    timestamp: new Date().toISOString(),
    deviceId: deviceId || 'ESP32_GATE',
  };
  const io = req.app.get('io');
  if (io) io.emit('hardware:fingerprint_captured', payload);

  return res.json({
    status: 'success',
    message: `New fingerprint ID ${result.fingerprintId} captured and ready to map.`,
    ...payload,
  });
});

router.post('/hardware/scan', (req, res) => {
  const { studentId, fingerprintId, deviceId } = req.body || {};
  if (studentId === undefined && fingerprintId === undefined) {
    return res.status(400).json({
      error: 'missing_identifier',
      message: 'Either fingerprintId or studentId is required.',
    });
  }

  const scanResult = store.recordHardwareScan({ studentId, fingerprintId, deviceId });
  const liveStats = store.getLiveStats();

  const io = req.app.get('io');
  if (io) {
    io.emit('attendance:update', scanResult);
    io.emit('dashboard:stats_changed', liveStats);
  }

  let statusCode = 200;
  if (scanResult.status === 'unregistered') statusCode = 404;
  else if (scanResult.status === 'error') statusCode = 400;

  return res.status(statusCode).json(scanResult);
});

router.post('/hardware/enroll', (req, res) => {
  const { studentId, name, fingerprintId } = req.body || {};
  if (!studentId || !name || fingerprintId === undefined || fingerprintId === null) {
    return res.status(400).json({ error: 'missing_fields', message: 'studentId, name, and fingerprintId are all required for enrollment.' });
  }
  const normalizedStudentId = String(studentId).trim().toUpperCase();
  const trimmedName = String(name).trim();
  const parsedFpId = parseInt(fingerprintId, 10);

  const nameRegex = /^[A-Za-z\s]+$/;
  const studentIdRegex = /^[A-Za-z0-9]{9}$/;

  if (!nameRegex.test(trimmedName)) {
    return res.status(400).json({ error: 'invalid_name', message: 'Name must only contain letters and spaces.' });
  }

  if (!studentIdRegex.test(normalizedStudentId)) {
    return res.status(400).json({ error: 'invalid_student_id', message: 'Student ID must be strictly alphanumeric and 9 characters long.' });
  }

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
