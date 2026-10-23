import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function Login() {
  const { loginWithOtp, requestOtp, isAuthenticated, role, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in: navigate straight to the appropriate dashboard
  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  async function handleRequestOtp(event) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setFormError('Please enter your VIT-AP email address.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const data = await requestOtp(trimmedEmail);
      setSuccessMsg(data?.message || 'OTP sent to your VIT-AP email address.');
      setStep(2);
    } catch (error) {
      setFormError(error.message || 'Could not send OTP. Please check your email.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setFormError('Please enter a 6-digit OTP.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const user = await loginWithOtp(email.trim().toLowerCase(), trimmedOtp);
      const target = location.state?.from || homePathForRole(user.role);
      navigate(target, { replace: true });
    } catch (error) {
      setFormError(error.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setSubmitting(true);
    setFormError('');
    try {
      await requestOtp(email.trim().toLowerCase());
      setSuccessMsg('A new OTP has been sent to your email.');
    } catch (error) {
      setFormError(error.message || 'Failed to resend OTP.');
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
          <h2>Secure, Passwordless Access.</h2>
          <p>
            Sign in with your official VIT-AP college email using a secure one-time password (OTP).
            Students and Mess Administrators are routed automatically to their respective portals.
          </p>

          <div className="login-flow" aria-hidden="true">
            <span className="flow-step">1 · Enter VIT-AP Email</span>
            <span className="flow-step">2 · Receive 6-digit OTP</span>
            <span className="flow-step">3 · Instant Authentication</span>
          </div>
        </div>

        <p className="login-foot">
          Official VIT-AP Smart Food Wastage Analyser Portal &bull; Designed for Students & Mess Administrators.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-card-head">
            <h1>{step === 1 ? 'Sign in to Smart Mess' : 'Verify Your Email'}</h1>
            <p>
              {step === 1
                ? 'Enter your university email to receive a login verification code.'
                : `Enter the 6-digit code sent to ${email}`}
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
                <label htmlFor="college-email">College Email Address</label>
                <input
                  id="college-email"
                  type="email"
                  className="input"
                  placeholder="e.g. 24bce7998@vitapstudent.ac.in"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                  }}
                  autoFocus
                  required
                />
                <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem', display: 'block' }}>
                  Students: <strong>@vitapstudent.ac.in</strong> &bull; Mess Staff: <strong>@vitap.ac.in</strong>
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              >
                {submitting ? 'Sending OTP…' : 'Get Verification Code'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Don&apos;t have an account? </span>
                <Link to="/signup" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  Sign up
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
                    Change Email
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
                {submitting ? 'Verifying…' : 'Verify & Sign In'}
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
