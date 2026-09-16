'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { searchUsers, startChat } from '../app/actions'

export default function NewChatSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 0) {
        setIsSearching(true)
        try {
          const res = await searchUsers(query.trim())
          if (res && res.users) {
            setResults(res.users)
          } else {
            setResults([])
          }
        } catch (e) {
          console.error(e)
          setResults([])
        }
        setIsSearching(false)
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleStartChat = async (userId: string) => {
    try {
      const res = await startChat(userId)
      if (res && res.chatId) {
        setQuery('')
        setResults([])
        router.push(`/chat/${res.chatId}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search astronauts to transmit a signal..."
          className="form-input"
          style={{ paddingLeft: '44px', borderRadius: '100px' }}
        />
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '1rem', pointerEvents: 'none' }}>
          ⌕
        </span>
      </div>
      
      {query.trim().length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: 'var(--panel-solid)',
          border: '1px solid var(--line)',
          borderRadius: '18px',
          boxShadow: 'var(--shadow)',
          zIndex: 50,
          maxHeight: '280px',
          overflowY: 'auto',
          backdropFilter: 'blur(20px)'
        }}>
          {isSearching ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Scanning cosmic frequencies...
            </div>
          ) : results.length > 0 ? (
            <div style={{ padding: '8px 0' }}>
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    transition: 'background 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className={`user-avatar ${user.color || 'green'}`} style={{ width: '38px', height: '38px', fontSize: '0.9rem', flexShrink: 0 }}>
                    {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (user.avatarUrl || user.username?.charAt(0).toUpperCase())}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
                    <div style={{ color: 'var(--earth)', fontSize: '0.78rem' }}>@{user.handle}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Signal ↗</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No astronauts located in this sector.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
