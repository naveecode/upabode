'use client'

import { useEffect } from 'react'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Chat error boundary caught:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '24px',
      textAlign: 'center',
      color: 'var(--text)'
    }}>
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: 'rgba(237, 118, 86, 0.15)',
        border: '1px solid rgba(237, 118, 86, 0.4)',
        display: 'grid',
        placeItems: 'center',
        marginBottom: '16px'
      }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--mars)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.3rem', marginBottom: '8px' }}>
        Quantum Relay Interrupted
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', maxWidth: '340px', lineHeight: 1.5, marginBottom: '24px' }}>
        A momentary signal fluctuation occurred while establishing the connection.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => {
            window.location.reload()
          }}
          style={{
            background: 'var(--earth)',
            color: '#07111f',
            border: 'none',
            padding: '10px 22px',
            borderRadius: '100px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Reconnect Signal ⟳
        </button>
        <button
          onClick={() => {
            window.location.href = '/chat'
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text)',
            border: '1px solid var(--line)',
            padding: '10px 20px',
            borderRadius: '100px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Return to Inbox
        </button>
      </div>
    </div>
  )
}
