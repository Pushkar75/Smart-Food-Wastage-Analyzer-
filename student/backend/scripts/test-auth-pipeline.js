const path = require('path');
const express = require('express');
const cors = require('cors');

const store = require('../store');
const otpService = require('../otpService');
const apiRouter = require('../routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

let server;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  const PORT = 5588;
  server = app.listen(PORT);
  const BASE = `http://127.0.0.1:${PORT}`;

  console.log('\n=== RUNNING AUTH & REGISTRATION PIPELINE TESTS ===\n');

  try {
    // 1. Domain restriction on /api/auth/request-otp
    console.log('1. Testing Domain Restriction on Login...');
    const res1 = await fetch(`${BASE}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'intruder@gmail.com' })
    });
    const data1 = await res1.json();
    assert(res1.status === 400, 'Rejects non-student domain with 400');
    assert(data1.error === 'Invalid domain. Students must use a @vitapstudent.ac.in email address.', 'Returns exact error message: Invalid domain. Students must use a @vitapstudent.ac.in email address.');

    // 1b. Reject admin @vitap.ac.in domain on student login
    const res1b = await fetch(`${BASE}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vitap.ac.in' })
    });
    const data1b = await res1b.json();
    assert(res1b.status === 400, 'Rejects @vitap.ac.in domain with 400 on student login');
    assert(data1b.error === 'Invalid domain. Students must use a @vitapstudent.ac.in email address.', 'Returns exact error message on @vitap.ac.in');

    // 2. Domain restriction on /api/auth/register-request
    console.log('\n2. Testing Domain Restriction on Registration...');
    const res2 = await fetch(`${BASE}/api/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker', email: 'intruder@yahoo.com', role: 'student' })
    });
    const data2 = await res2.json();
    assert(res2.status === 400, 'Rejects non-student domain with 400 on register');
    assert(data2.error === 'Invalid domain. Students must use a @vitapstudent.ac.in email address.', 'Returns exact error message on register');

    // 2b. Reject admin @vitap.ac.in domain on student register
    const res2b = await fetch(`${BASE}/api/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin Intruder', email: 'admin@vitap.ac.in', role: 'student' })
    });
    const data2b = await res2b.json();
    assert(res2b.status === 400, 'Rejects @vitap.ac.in on student register with 400');
    assert(data2b.error === 'Invalid domain. Students must use a @vitapstudent.ac.in email address.', 'Returns exact error message for @vitap.ac.in on register');

    // 3. Login attempt with unregistered VIT-AP email
    console.log('\n3. Testing Login for Unregistered Account...');
    const res3 = await fetch(`${BASE}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unregistered.user@vitapstudent.ac.in' })
    });
    const data3 = await res3.json();
    assert(res3.status === 404, 'Returns 404 for unregistered account');
    assert(data3.error === 'Account not found. Please sign up first.', 'Returns exact error message: Account not found. Please sign up first.');

    // 4. Student Registration Request
    console.log('\n4. Testing Student Registration Request...');
    const timestamp = Date.now();
    const studentEmail = `student.${timestamp}@vitapstudent.ac.in`;
    const res4 = await fetch(`${BASE}/api/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Tester',
        email: studentEmail,
        role: 'student',
        studentId: '24BCE7998'
      })
    });
    const data4 = await res4.json();
    assert(res4.status === 200, 'Student registration request succeeds with 200');
    assert(data4.demoOtp === undefined, 'STRICT OTP CONCEALMENT: demoOtp is not present in response');
    assert(data4.otp === undefined, 'STRICT OTP CONCEALMENT: otp is not present in response');

    // Verify pending registration was saved
    const pendingStudent = otpService.getPendingRegistration(studentEmail);
    assert(pendingStudent !== null, 'Pending registration stored in memory');
    const studentOtp = otpService.getStoredOtp(studentEmail);
    assert(typeof studentOtp === 'string' && studentOtp.length === 6, 'Generated 6-digit OTP');

    // 5. Student Registration Verification
    console.log('\n5. Testing Student Registration Verification...');
    // Wrong OTP
    const res5Wrong = await fetch(`${BASE}/api/auth/register-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, otp: '000000' })
    });
    assert(res5Wrong.status === 400, 'Rejects invalid OTP with 400');

    // Valid OTP
    const res5 = await fetch(`${BASE}/api/auth/register-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, otp: studentOtp })
    });
    const data5 = await res5.json();
    assert(res5.status === 200, 'Student registration verification succeeds with 200');
    assert(typeof data5.token === 'string', 'JWT token returned on registration');
    assert(data5.user.name === 'Student Tester', 'User name matches');
    assert(data5.user.studentId === '24BCE7998' || data5.user.regNo === '24BCE7998', 'Student regNo matches');
    assert(data5.user.role === 'student', 'User role is student');

    // Verify DB insertion
    const dbStudent = store.getUserByEmail(studentEmail);
    assert(dbStudent !== null, 'User persisted in SQLite database');

    // 6. Mess Admin Registration Blocked on Student Portal
    console.log('\n6. Testing Mess Admin Registration Blocked on Student Portal...');
    const adminEmail = `admin.${timestamp}@vitap.ac.in`;
    const res6 = await fetch(`${BASE}/api/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rajesh Kumar',
        email: adminEmail,
        role: 'admin',
        hostel: 'MH-3'
      })
    });
    const data6 = await res6.json();
    assert(res6.status === 400, 'Admin registration rejected on student backend with 400');
    assert(data6.error === 'Invalid domain. Students must use a @vitapstudent.ac.in email address.', 'Returns exact error message');

    // 7. Login Flow for Registered Student
    console.log('\n7. Testing Login Flow for Registered Student...');
    const res7 = await fetch(`${BASE}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail })
    });
    const data7 = await res7.json();
    assert(res7.status === 200, 'Login OTP requested successfully');
    assert(data7.demoOtp === undefined && data7.otp === undefined, 'STRICT OTP CONCEALMENT: no OTP in login response');

    const loginOtp = otpService.getStoredOtp(studentEmail);
    const res7Verify = await fetch(`${BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, otp: loginOtp })
    });
    const data7Verify = await res7Verify.json();
    assert(res7Verify.status === 200, 'Login OTP verification succeeds');
    assert(typeof data7Verify.token === 'string', 'Login returns valid JWT token');
    assert(data7Verify.user.name === 'Student Tester', 'Login user payload contains student name');
    assert(data7Verify.user.role === 'student', 'Login user payload contains student role');

    // 8. Enrollment Form Validation
    console.log('\n8. Testing Hardware Enrollment Validation...');
    const res8BadName = await fetch(`${BASE}/api/hardware/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John123!', studentId: '24BCE7998', fingerprintId: 88 })
    });
    assert(res8BadName.status === 400, 'Rejects invalid name containing numbers/special characters with 400');

    const res8BadId = await fetch(`${BASE}/api/hardware/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid Name', studentId: '24BCE-7998', fingerprintId: 89 })
    });
    assert(res8BadId.status === 400, 'Rejects invalid studentId with 400');

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
