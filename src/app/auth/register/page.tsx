'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { registerUser } from '../../actions';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState('');
  const [avatarColor, setAvatarColor] = useState('green');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = [
    { id: 'green', name: 'Earth', bg: 'linear-gradient(135deg, var(--earth), var(--earth-dark))' },
    { id: 'orange', name: 'Mars', bg: 'linear-gradient(135deg, var(--mars), #8a2be2)' },
    { id: 'blue', name: 'Ocean', bg: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('handle', handle.trim().replace(/^@/, ''));
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password);
      if (location) formData.append('location', location.trim());
      formData.append('avatarColor', avatarColor);
      formData.append('color', avatarColor);
      
      const result = await registerUser(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during registration.');
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
            <span className="brand-mark" style={{ width: '36px', height: '36px' }}>
              <img src="/icon.png" alt="Upabode" width={36} height={36} />
            </span>
            <span style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.03em'
            }}>Upabode</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
            Establish your identity in the quantum network
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              placeholder="astronaut@orbit.net"
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
            {loading ? 'Initializing...' : 'Initialize Quantum Link'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--line)' }} />
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Or</div>
          <div style={{ height: '1px', flex: 1, background: 'var(--line)' }} />
        </div>

        <a
          href="/api/auth/google"
          style={{
            display: 'block',
            textAlign: 'center',
            background: 'white',
            color: '#333',
            padding: '14px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            border: '1px solid #ddd'
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
          Register with Google
        </a>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
            Already registered?{' '}
            <Link href="/auth/login" style={{ color: 'var(--earth)', fontWeight: 600, textDecoration: 'none' }}>
              Log in with credentials
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
