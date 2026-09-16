'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HeaderActions({ user }: { user: any }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore?query=${encodeURIComponent(searchQuery.trim())}&focus=true`)
    } else {
      router.push('/explore?focus=true')
    }
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          onClick={() => router.push('/explore?focus=true')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--panel-solid)',
            border: '1px solid var(--line)',
            borderRadius: '100px',
            padding: '6px 14px',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '0.8rem'
          }}
        >
          <span>🔍</span>
          <span style={{ fontSize: '0.8rem' }}>Search</span>
        </div>
        <Link href="/auth/register" className="bg-[var(--earth)] text-[var(--panel-solid)] px-4 py-1.5 rounded-full font-bold text-sm hover:bg-[var(--earth-dark)] transition-colors">
          Login / Register
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Top Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ margin: 0 }}>
        <div
          onClick={() => router.push('/explore?focus=true')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--panel-solid)',
            border: '1px solid var(--line)',
            borderRadius: '100px',
            padding: '6px 14px',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '0.82rem',
            transition: 'border-color 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--earth)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
        >
          <span style={{ color: 'var(--earth)', fontSize: '0.9rem' }}>🔍</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            Search signals...
          </span>
        </div>
      </form>

      <Link href="/chat" className="relative p-2 text-[var(--text)] hover:text-[var(--earth)] transition-colors" title="Signals / Messages">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </Link>
      <Link href="/profile">
        {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} alt="Profile" className="w-8 h-8 rounded-full border-2 border-transparent hover:border-[var(--earth)] transition-colors" style={{ backgroundColor: user.color || 'var(--earth)' }} /> : <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border-2 border-transparent hover:border-[var(--earth)] transition-colors" style={{ backgroundColor: user.color || 'var(--earth)' }}>{user.avatarUrl || user.username?.charAt(0)?.toUpperCase()}</div>}
      </Link>
    </div>
  )
}

