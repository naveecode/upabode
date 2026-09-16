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
      <Link href="/chat" className="relative p-2 text-white hover:text-[var(--earth)] transition-colors">
        <span className="text-xl">dY'</span>
      </Link>
      <Link href="/profile">
        <img 
          src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.handle} 
          alt="Profile" 
          className="w-8 h-8 rounded-full border-2 border-transparent hover:border-[var(--earth)] transition-colors"
          style={{ backgroundColor: user.color || 'var(--earth)' }}
        />
      </Link>
      
      {showModal && <CreateSignalModal onClose={() => setShowModal(false)} />}
    </>
  )
}
