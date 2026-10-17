'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { searchUsersForMention } from '../app/actions'

export interface MentionUser {
  id: string
  username: string
  handle: string
  avatarUrl?: string | null
  color?: string | null
}

interface MentionDropdownProps {
  users: MentionUser[]
  selectedIndex: number
  onSelect: (user: MentionUser) => void
  isLoading?: boolean
  style?: React.CSSProperties
}

export function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  isLoading,
  style
}: MentionDropdownProps) {
  if (!isLoading && users.length === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        width: 'min(320px, 90vw)',
        maxHeight: '220px',
        overflowY: 'auto',
        background: 'rgba(10, 18, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(64, 201, 162, 0.35)',
        borderRadius: '16px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.65), 0 0 15px rgba(64, 201, 162, 0.15)',
        zIndex: 99999,
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxSizing: 'border-box',
        ...style
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
    >
      <div style={{
        padding: '4px 10px 6px',
        fontSize: '0.68rem',
        color: 'var(--earth)',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Mention Orbit User</span>
        {isLoading && <span style={{ opacity: 0.7 }}>Scanning...</span>}
      </div>

      {users.map((user, idx) => {
        const isSelected = idx === selectedIndex
        return (
          <div
            key={user.id}
            onClick={() => onSelect(user)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(64, 201, 162, 0.18)' : 'transparent',
              border: isSelected ? '1px solid rgba(64, 201, 162, 0.3)' : '1px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              className={`user-avatar ${user.color || 'green'}`}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                fontSize: '0.75rem',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden'
              }}
            >
              {user.avatarUrl?.startsWith('http') ? (
                <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.avatarUrl || user.username.charAt(0).toUpperCase()
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.username}
              </span>
              <span style={{
                fontSize: '0.74rem',
                color: 'var(--earth)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                @{user.handle}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Hook to manage @mention suggestions on any text input or textarea
 */
export function useMentionAutocomplete({
  text,
  setText,
  inputRef
}: {
  text: string
  setText: (newText: string) => void
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<MentionUser[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Detect @query at cursor position
  const checkMention = useCallback(() => {
    const el = inputRef.current
    if (!el) return

    const cursor = el.selectionStart ?? text.length
    const textBeforeCursor = text.slice(0, cursor)

    // Match word starting with @ before cursor
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/)
    if (match) {
      const q = match[1]
      setQuery(q)
      setIsOpen(true)
      setSelectedIndex(0)
    } else {
      setIsOpen(false)
      setQuery('')
    }
  }, [text, inputRef])

  // Perform search when query changes
  useEffect(() => {
    if (!isOpen) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await searchUsersForMention(query || 'a')
        if (res && res.users) {
          setUsers(res.users)
        }
      } catch {
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }, 120)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [isOpen, query])

  // Check mention on text change
  useEffect(() => {
    checkMention()
  }, [text, checkMention])

  const selectUser = useCallback((user: MentionUser) => {
    const el = inputRef.current
    if (!el) return

    const cursor = el.selectionStart ?? text.length
    const textBeforeCursor = text.slice(0, cursor)
    const textAfterCursor = text.slice(cursor)

    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/)
    if (match) {
      const matchStart = textBeforeCursor.lastIndexOf('@')
      const newBefore = textBeforeCursor.slice(0, matchStart) + `@${user.handle} `
      const updated = newBefore + textAfterCursor
      setText(updated)
      setIsOpen(false)

      setTimeout(() => {
        if (el) {
          el.focus()
          const newPos = newBefore.length
          el.setSelectionRange(newPos, newPos)
        }
      }, 10)
    }
  }, [text, setText, inputRef])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || users.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % users.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + users.length) % users.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (users[selectedIndex]) {
        e.preventDefault()
        selectUser(users[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [isOpen, users, selectedIndex, selectUser])

  return {
    isOpen,
    users,
    selectedIndex,
    isLoading,
    selectUser,
    handleKeyDown,
    close: () => setIsOpen(false)
  }
}
