import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';
import '../styles/login.css';

const HOSTEL_OPTIONS = [
  { value: 'MH-1', label: "MH-1 (Men's Hostel 1)" },
  { value: 'MH-2', label: "MH-2 (Men's Hostel 2)" },
  { value: 'MH-3', label: "MH-3 (Men's Hostel 3)" },
  { value: 'MH-4', label: "MH-4 (Men's Hostel 4)" },
  { value: 'MH-5', label: "MH-5 (Men's Hostel 5)" },
  { value: 'MH-6', label: "MH-6 (Men's Hostel 6)" },
  { value: 'MH-7', label: "MH-7 (Men's Hostel 7)" },
  { value: 'LH-1', label: "LH-1 (Ladies' Hostel 1)" },
  { value: 'LH-2', label: "LH-2 (Ladies' Hostel 2)" },
  { value: 'LH-3', label: "LH-3 (Ladies' Hostel 3)" },
  { value: 'LH-4', label: "LH-4 (Ladies' Hostel 4)" },
];

export default function Signup() {
  const { registerRequest, registerVerify, isAuthenticated, role, bootstrapping } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [hostel, setHostel] = useState('MH-1');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  async function handleRequestOtp(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedRegNo = regNo.trim().toUpperCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!trimmedRegNo) {
      setFormError('Please enter your Registration Number (e.g. 24BCE7998).');
      return;
    }
    if (!trimmedEmail) {
      setFormError('Please enter your college email address.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const data = await registerRequest({
        name: trimmedName,
        email: trimmedEmail,
        role: 'student',
        studentId: trimmedRegNo,
        regNo: trimmedRegNo,
        hostel,
      });
      setSuccessMsg(data?.message || 'Verification code sent to your college email.');
      setStep(2);
    } catch (error) {
      setFormError(error.message || 'Could not send verification code. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setFormError('Please enter a 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const user = await registerVerify(email.trim().toLowerCase(), trimmedOtp);
      navigate(homePathForRole(user.role), { replace: true });
    } catch (error) {
      setFormError(error.message || 'Invalid or expired code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setSubmitting(true);
    setFormError('');
    try {
      const data = await registerRequest({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'student',
        studentId: regNo.trim().toUpperCase(),
        regNo: regNo.trim().toUpperCase(),
        hostel,
      });
      setSuccessMsg('A new verification code has been sent to your email.');
    } catch (error) {
      setFormError(error.message || 'Failed to resend code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-head">
          <span className="brand-mark" aria-hidden="true">🍃</span>
          <span className="brand-text">
            <span className="brand-name">Smart Mess</span>
            <span className="brand-sub">VIT-AP University</span>
          </span>
        </div>

        <div className="login-pitch">
          <h2>Create Your Student Account.</h2>
          <p>
            Join the Smart Food Wastage Analyser to mark meal attendance, report eating intentions,
            and help reduce food waste across VIT-AP campus.
          </p>

          <div className="login-flow" aria-hidden="true">
            <span className="flow-step">1 · Enter Details</span>
            <span className="flow-step">2 · Verify OTP</span>
            <span className="flow-step">3 · Access Dashboard</span>
          </div>
        </div>

        <p className="login-foot">
          Official Student Registration &bull; VIT-AP University.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-card-head">
            <h1>{step === 1 ? 'Student Registration' : 'Verify Your Email'}</h1>
            <p>
              {step === 1
                ? 'Register with your VIT-AP student email and registration number.'
                : `Enter the 6-digit verification code sent to ${email}`}
            </p>
          </div>

          {formError && (
            <div className="form-error" role="alert" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}

          {successMsg && (
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '0.875rem' }}>
              {successMsg}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="login-form" noValidate>
              <div className="form-row">
                <label htmlFor="student-name">Full Name</label>
                <input
                  id="student-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Pushkar Sharma"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="student-regno">Registration Number</label>
                <input
                  id="student-regno"
                  type="text"
                  className="input"
                  placeholder="e.g. 24BCE7998"
                  value={regNo}
                  onChange={(e) => {
                    setRegNo(e.target.value);
                    if (formError) setFormError('');
                  }}
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="student-hostel">Hostel Block</label>
                <select
                  id="student-hostel"
                  className="input"
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  style={{ height: '42px', appearance: 'auto' }}
                  required
                >
                  {HOSTEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="student-email">College Email Address</label>
                <input
                  id="student-email"
                  type="email"
                  className="input"
                  placeholder="e.g. 24bce7998@vitapstudent.ac.in"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                  }}
                  required
                />
                <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem', display: 'block' }}>
                  Must end with <strong>@vitapstudent.ac.in</strong> or <strong>@vitap.ac.in</strong>
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              >
                {submitting ? 'Sending Code…' : 'Get Verification Code'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Already have an account? </span>
                <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="login-form" noValidate>
              <div className="form-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label htmlFor="otp-input">6-Digit Verification Code</label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp('');
                      setFormError('');
                      setSuccessMsg('');
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                  >
                    Change Details
                  </button>
                </div>
                <input
                  id="otp-input"
                  type="text"
                  className="input"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtp(val);
                    if (formError) setFormError('');
                  }}
                  autoFocus
                  required
                  style={{ letterSpacing: '4px', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || otp.length !== 6}
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              >
                {submitting ? 'Verifying…' : 'Verify & Complete Registration'}
              </button>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={submitting}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', fontSize: '0.825rem', cursor: 'pointer' }}
                >
                  Didn&apos;t receive the code? Resend OTP
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', textAlign: 'center' }}>
            VIT-AP University &bull; Smart Food Wastage Analyser
          </div>
        </div>
      </section>
    </div>
  );
}
