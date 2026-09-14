'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { registerUser } from '../../actions';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [location, setLocation] = useState('');
  const [avatarColor, setAvatarColor] = useState('linear-gradient(135deg, var(--earth), var(--earth-dark))');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = [
    { name: 'Earth', value: 'linear-gradient(135deg, var(--earth), var(--earth-dark))' },
    { name: 'Mars', value: 'linear-gradient(135deg, var(--mars), #8a2be2)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('handle', handle);
      if (location) formData.append('location', location);
      formData.append('avatarColor', avatarColor);
      
      const result = await registerUser(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'var(--background)'
    }}>
      <div style={{
        background: 'rgba(18, 34, 54, 0.78)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '25px',
        backdropFilter: 'blur(18px)',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '2rem', margin: '0 0 8px 0', color: 'var(--text)' }}>
            Orbit
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Join the universe</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '12px', borderRadius: '12px', color: 'var(--danger)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: avatarColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '2.5rem',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            {username ? username.charAt(0).toUpperCase() : '?'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'var(--text)',
                outline: 'none',
              }}
              placeholder="Your name"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>Handle</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 34px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'var(--text)',
                  outline: 'none',
                }}
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>Location (Optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'var(--text)',
                outline: 'none',
              }}
              placeholder="e.g. Mars Base 1"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>Theme Color</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {colors.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setAvatarColor(color.value)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: color.value,
                    border: avatarColor === color.value ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0
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
              padding: '16px',
              background: 'var(--earth)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Launching...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Already have an account? <Link href="/auth/login" style={{ color: 'var(--earth)', textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
