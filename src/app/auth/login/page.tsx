'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginUser } from '../../actions';

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isGoogleConnecting) return;
    setIsGoogleConnecting(true);
    const target = `/api/auth/google${returnUrl && returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`;
    window.location.href = target;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', identifier.trim().toLowerCase());
      formData.append('handle', identifier.trim().replace(/^@/, ''));
      formData.append('password', password);
      
      const result = await loginUser(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        window.location.href = returnUrl;
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during login.');
      setLoading(false);
    }
  };

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
              Connecting to Google Orbit
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
        padding: '40px 34px',
        width: '100%',
        maxWidth: '440px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px'
          }}>
            <span className="brand-mark" style={{ width: '38px', height: '38px' }}>
              <img src="/icon.png" alt="Upabode" width={38} height={38} />
            </span>
            <span style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.03em'
            }}>Upabode</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
            Welcome back, cosmic explorer
          </p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Email or Handle */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email or Astronaut Handle
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                color: 'var(--text)',
                outline: 'none',
                fontSize: '0.95rem'
              }}
              placeholder="name@orbit.net or @handle"
            />
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
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                color: 'var(--text)',
                outline: 'none',
                fontSize: '0.95rem'
              }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isGoogleConnecting}
            style={{
              background: 'var(--earth)',
              color: '#07111f',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 700,
              fontSize: '1.05rem',
              cursor: loading || isGoogleConnecting ? 'not-allowed' : 'pointer',
              opacity: loading || isGoogleConnecting ? 0.7 : 1,
              transition: 'background 0.2s',
              marginTop: '8px'
            }}
          >
            {loading ? 'Authenticating...' : 'Establish Connection'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--line)' }} />
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Or</div>
          <div style={{ height: '1px', flex: 1, background: 'var(--line)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
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
          {isGoogleConnecting ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
            New to Orbit?{' '}
            <Link href={`/auth/register${returnUrl && returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} style={{ color: 'var(--earth)', fontWeight: 600, textDecoration: 'none' }}>
              Register new account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
