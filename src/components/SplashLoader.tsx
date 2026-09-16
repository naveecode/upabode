'use client'

import { useState, useEffect } from 'react'

export default function SplashLoader() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Check if splash was already shown in this session
    const hasSeenSplash = localStorage.getItem('upabode_initialized')
    if (hasSeenSplash) {
      setVisible(false)
      return
    }

    const timer = setTimeout(() => {
      setFading(true)
      setTimeout(() => {
        setVisible(false)
        localStorage.setItem('upabode_initialized', 'true')
      }, 400)
    }, 700)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: fading ? 'none' : 'auto'
      }}
    >
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(64, 201, 162, 0.25) 0%, transparent 70%)',
        filter: 'blur(30px)',
        animation: 'pulse 2s infinite'
      }} />

      {/* Upabode Brand Logo */}
      <div style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--earth), #137b7d)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 0 50px rgba(64, 201, 162, 0.5)',
          animation: 'pulse 1.8s infinite'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: '3.5px solid white',
            background: 'transparent'
          }} />
        </div>
      </div>

      {/* Upabode Brand Typography */}
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '2.4rem',
        fontWeight: 800,
        letterSpacing: '0.08em',
        color: 'var(--text)',
        marginBottom: '8px',
        textTransform: 'uppercase'
      }}>
        Upabode
      </h1>

      <p style={{
        fontSize: '0.85rem',
        color: 'var(--earth)',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: '28px'
      }}>
        Quantum Planetary Network
      </p>

      {/* Sleek loading bar */}
      <div style={{
        width: '180px',
        height: '3px',
        borderRadius: '100px',
        background: 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '50%',
          background: 'var(--earth)',
          borderRadius: '100px',
          animation: 'splashLoading 1.2s infinite ease-in-out'
        }} />
      </div>

      <style jsx>{`
        @keyframes splashLoading {
          0% { left: -50%; width: 30%; }
          50% { width: 60%; }
          100% { left: 100%; width: 30%; }
        }
      `}</style>
    </div>
  )
}
