'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerUser, sendRegistrationOtp } from '../../actions';
import { validateEmail } from '../../../lib/emailValidator';
import MultigramLogo from '../../../components/MultigramLogo';

function RegisterForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState('');
  const [avatarColor, setAvatarColor] = useState('green');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.user && active) {
            window.location.href = returnUrl && !returnUrl.includes('/auth/') ? returnUrl : '/';
          }
        }
      } catch {}
    };

    checkAuth();

    const onFocus = () => {
      checkAuth();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [returnUrl]);

  useEffect(() => {
    if (isGoogleConnecting) {
      const timer = setTimeout(() => {
        setIsGoogleConnecting(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isGoogleConnecting]);

  const handleGoogleRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isGoogleConnecting) return;
    setIsGoogleConnecting(true);
    const target = `/api/auth/google${returnUrl && returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`;
    window.location.href = target;
  };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const colors = [
    { id: 'green', name: 'Earth', bg: 'linear-gradient(135deg, var(--earth), var(--earth-dark))' },
    { id: 'orange', name: 'Mars', bg: 'linear-gradient(135deg, var(--mars), #8a2be2)' },
    { id: 'blue', name: 'Ocean', bg: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
  ];

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!username.trim()) {
      setError('Please enter your display name.');
      return;
    }

    if (!handle.trim()) {
      setError('Please enter a unique handle.');
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error || 'Please enter an approved email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendRegistrationOtp(email.trim().toLowerCase());
      if (res?.error) {
        setError(res.error);
      } else {
        setStep(2);
        setResendTimer(60);
        setInfoMessage(`Security transmission sent! Enter the 6-digit code sent to ${email}.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const res = await sendRegistrationOtp(email.trim().toLowerCase());
      if (res?.error) {
        setError(res.error);
      } else {
        setResendTimer(60);
        setInfoMessage(`A fresh security code was dispatched to ${email}.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('handle', handle.trim().replace(/^@/, ''));
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password);
      formData.append('otp', otp.trim());
      if (location) formData.append('location', location.trim());
      formData.append('avatarColor', avatarColor);
      formData.append('color', avatarColor);

      const result = await registerUser(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        window.location.href = returnUrl;
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during verification.');
      setLoading(false);
    }
  };

  const selectedColorObj = colors.find(c => c.id === avatarColor) || colors[0];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 20px',
      background: 'var(--background)'
    }}>
      {/* Full-Screen Instant Google Authorization Feedback */}
      {isGoogleConnecting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 17, 31, 0.94)',
          backdropFilter: 'blur(20px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: '3px solid rgba(197, 160, 89, 0.2)',
            borderTopColor: 'var(--earth)',
            animation: 'orbitSpin 0.8s linear infinite',
          }} />
          <div>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>
              Connecting to Google Multigram
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, maxWidth: '280px' }}>
              Securing quantum identity credentials...
            </p>
          </div>
        </div>
      )}

      <div style={{
        background: 'rgba(18, 34, 54, 0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '24px',
        backdropFilter: 'blur(20px)',
        padding: '36px 32px',
        width: '100%',
        maxWidth: '460px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px'
          }}>
            <span className="brand-mark" style={{ width: '40px', height: '40px', background: 'rgba(7, 17, 31, 0.9)', padding: '3px' }}>
              <MultigramLogo size={34} color="var(--earth)" />
            </span>
            <span style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.03em'
            }}>Multigram</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
            Establish your identity in the quantum network
          </p>
        </div>

        {/* Step indicator badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 14px',
            borderRadius: '100px',
            background: 'rgba(64, 201, 162, 0.15)',
            color: 'var(--earth)',
            border: '1px solid rgba(64, 201, 162, 0.3)'
          }}>
            {step === 1 ? 'Step 1 of 2 · Profile Parameters' : 'Step 2 of 2 · Cyber Verification'}
          </span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 107, 122, 0.12)',
            border: '1px solid var(--danger)',
            padding: '12px 16px',
            borderRadius: '12px',
            color: 'var(--danger)',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div style={{
            background: 'rgba(64, 201, 162, 0.12)',
            border: '1px solid var(--earth)',
            padding: '12px 16px',
            borderRadius: '12px',
            color: 'var(--earth)',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🔒</span>
            <span>{infoMessage}</span>
          </div>
        )}

        {step === 1 ? (
          <>
            {/* Live Avatar Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: selectedColorObj.bg,
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.2)',
                transition: 'background 0.3s ease'
              }}>
                {username ? username.charAt(0).toUpperCase() : '✦'}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Avatar Preview</span>
            </div>

            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Username */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="e.g. Neil Armstrong"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    outline: 'none',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              {/* Handle */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Handle
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    placeholder="astronaut"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 32px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      outline: 'none',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="astronaut@gmail.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.25)',
                    border: email.includes('@') && email.split('@')[0].includes('.') ? '1px solid var(--danger)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    outline: 'none',
                    fontSize: '0.92rem'
                  }}
                />
                {email.includes('@') && email.split('@')[0].includes('.') && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.74rem', marginTop: '5px' }}>
                    ⚠️ Dots in the name (e.g. user.name) are blocked to prevent temporary email spoofing.
                  </p>
                )}
                <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '4px' }}>
                  Approved: Gmail, Outlook, Yahoo, Proton, iCloud, Zoho, or .edu (no dots in name).
                </p>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--earth)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    outline: 'none',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.25)',
                    border: `1px solid ${confirmPassword && confirmPassword !== password ? 'var(--danger)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '12px',
                    color: 'var(--text)',
                    outline: 'none',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              {/* Location (Optional) */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Planetary Sector (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Earth Orbit Station, Mars Base Alpha"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    outline: 'none',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              {/* Avatar Color Choice */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Signal Aura Color
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {colors.map(color => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setAvatarColor(color.id)}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: color.bg,
                        border: avatarColor === color.id ? '2px solid white' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: avatarColor === color.id ? '0 0 12px rgba(64, 201, 162, 0.5)' : 'none',
                        transform: avatarColor === color.id ? 'scale(1.1)' : 'scale(1)',
                        transition: '0.15s ease'
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  color: '#07111f',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  opacity: loading ? 0.7 : 1,
                  transition: '0.2s ease',
                  boxShadow: '0 4px 20px rgba(64, 201, 162, 0.3)'
                }}
              >
                {loading ? 'Dispatched Code...' : 'Proceed to Verification Code →'}
              </button>
            </form>
          </>
        ) : (
          /* Step 2: 6-Digit Email OTP Verification */
          <form onSubmit={handleVerifyAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>🔐</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#f3f7fb', fontWeight: 700 }}>
                Enter Verification Code
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                We sent a 6-digit cryptographic passcode to:
                <br />
                <span style={{ color: 'var(--earth)', fontWeight: 700 }}>{email}</span>
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                6-Digit Security Passcode
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
                placeholder="••••••"
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid var(--earth)',
                  borderRadius: '14px',
                  color: 'var(--earth)',
                  outline: 'none',
                  fontSize: '2rem',
                  fontWeight: 800,
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  boxShadow: '0 0 25px rgba(64, 201, 162, 0.25)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                color: '#07111f',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                opacity: (loading || otp.length !== 6) ? 0.6 : 1,
                transition: '0.2s ease',
                boxShadow: '0 4px 20px rgba(64, 201, 162, 0.3)'
              }}
            >
              {loading ? 'Authenticating & Launching...' : 'Verify Code & Create Account ✦'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setInfoMessage(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                ← Edit details
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={handleResendOtp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendTimer > 0 ? 'var(--muted)' : 'var(--earth)',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: resendTimer > 0 ? 'default' : 'pointer',
                  padding: '4px 0'
                }}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend 6-Digit Code'}
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--line)' }} />
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Or</div>
          <div style={{ height: '1px', flex: 1, background: 'var(--line)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={isGoogleConnecting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            background: 'white',
            color: '#333',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '1rem',
            border: '1px solid #ddd',
            cursor: isGoogleConnecting ? 'not-allowed' : 'pointer',
            opacity: isGoogleConnecting ? 0.7 : 1,
            transition: 'opacity 0.2s, transform 0.1s',
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
          {isGoogleConnecting ? 'Connecting to Google...' : 'Register with Google'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
            Already registered?{' '}
            <Link href={`/auth/login${returnUrl && returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} style={{ color: 'var(--earth)', fontWeight: 600, textDecoration: 'none' }}>
              Log in with credentials
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
