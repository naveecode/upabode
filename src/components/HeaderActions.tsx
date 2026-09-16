'use client'

import { useState } from 'react'
import Link from 'next/link'
import CreateSignalModal from './CreateSignalModal'

export default function HeaderActions({ user }: { user: any }) {
  const [showModal, setShowModal] = useState(false)

  if (!user) {
    return (
      <Link href="/auth/register" className="bg-[var(--earth)] text-[var(--panel-solid)] px-4 py-1.5 rounded-full font-bold text-sm hover:bg-[var(--earth-dark)] transition-colors">
        Login / Register
      </Link>
    )
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className="bg-[var(--earth)] text-[var(--panel-solid)] px-4 py-1.5 rounded-full font-bold text-sm hover:bg-[var(--earth-dark)] transition-colors">
        + Signal
      </button>
      <Link href="/chat" className="relative p-2 text-[var(--text)] hover:text-[var(--earth)] transition-colors" title="Signals / Messages">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </Link>
      <Link href="/profile">
        {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} alt="Profile" className="w-8 h-8 rounded-full border-2 border-transparent hover:border-[var(--earth)] transition-colors" style={{ backgroundColor: user.color || 'var(--earth)' }} /> : <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white border-2 border-transparent hover:border-[var(--earth)] transition-colors" style={{ backgroundColor: user.color || 'var(--earth)' }}>{user.avatarUrl || user.username?.charAt(0)?.toUpperCase()}</div>}
      </Link>
      
      {showModal && <CreateSignalModal onClose={() => setShowModal(false)} />}
    </>
  )
}

