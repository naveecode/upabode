'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getPusherClient } from '../lib/pusher'
import { updateLastSeen, signalCall } from '../app/actions'
import { showToast } from './Toast'
import { haptic } from '../lib/soundAndHaptics'

interface GlobalCallManagerProps {
  currentUser?: {
    id: string
    username?: string | null
    handle?: string | null
    avatarUrl?: string | null
  } | null
}

interface IncomingCallData {
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string | null
  callType: 'video' | 'audio'
  peerId?: string
  timestamp: number
}

export default function GlobalCallManager({ currentUser }: GlobalCallManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const ringtoneOscillatorRef = useRef<(() => void) | null>(null)

  // 1. Heartbeat to keep active/online presence updated
  useEffect(() => {
    if (!currentUser?.id) return
    updateLastSeen().catch(() => {})
    const interval = setInterval(() => {
      updateLastSeen().catch(() => {})
    }, 45000)
    return () => clearInterval(interval)
  }, [currentUser?.id])

  // 2. Background audio/video pause on tab switch or screen lock (Req 8)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.querySelectorAll('video, audio').forEach((media) => {
          try {
            (media as HTMLMediaElement).pause()
          } catch (e) {}
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleVisibilityChange)
    }
  }, [])

  // 3. Synthesized Web Audio Ringtone (100% reliable, zero asset dependencies)
  const startRingtone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return () => {}
      const ctx = new AudioContextClass()
      let isPlaying = true

      const playChime = () => {
        if (!isPlaying || ctx.state === 'closed') return
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(480, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.35)

        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.6)

        // Repeat every 1.8s
        setTimeout(() => {
          if (isPlaying) playChime()
        }, 1800)
      }

      playChime()

      return () => {
        isPlaying = false
        try {
          ctx.close().catch(() => {})
        } catch (e) {}
      }
    } catch (e) {
      return () => {}
    }
  }

  // 4. Pusher subscription to personal user channel for Calls & Messages (Req 3)
  useEffect(() => {
    if (!currentUser?.id) return

    // Request notification permission if not asked yet
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {})
      } catch (e) {}
    }

    const pusher = getPusherClient()
    if (!pusher) return

    const userChannel = pusher.subscribe(`user-${currentUser.id}`)

    // Handle Incoming Call anywhere in app
    userChannel.bind('incoming-call', (data: IncomingCallData) => {
      // Don't ring if already in that specific chat room
      if (pathname === `/chat/${data.chatId}`) return

      haptic(25)
      setIncomingCall(data)

      // Start ringing audio
      if (ringtoneOscillatorRef.current) ringtoneOscillatorRef.current()
      ringtoneOscillatorRef.current = startRingtone()

      // Show system notification if outside window
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Incoming ${data.callType === 'video' ? 'Video' : 'Voice'} Signal`, {
            body: `${data.senderName} is calling you on Multigram...`,
            icon: data.senderAvatar || '/icon.png',
            tag: `call-${data.chatId}`,
            requireInteraction: true,
          })
        } catch (e) {}
      }
    })

    // Handle New Message anywhere in app
    userChannel.bind('new-message', (data: { chatId: string; senderName: string; content: string; senderAvatar?: string }) => {
      // If currently inside this chat room, ChatRoom.tsx handles it
      if (pathname === `/chat/${data.chatId}`) return

      haptic(10)
      showToast(`💬 ${data.senderName}: ${data.content.slice(0, 40)}`)

      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification(data.senderName, {
            body: data.content,
            icon: data.senderAvatar || '/icon.png',
            tag: `msg-${data.chatId}`
          })
        } catch (e) {}
      }
    })

    return () => {
      pusher.unsubscribe(`user-${currentUser.id}`)
      if (ringtoneOscillatorRef.current) {
        ringtoneOscillatorRef.current()
        ringtoneOscillatorRef.current = null
      }
    }
  }, [currentUser?.id, pathname])

  const handleAccept = () => {
    if (!incomingCall) return
    if (ringtoneOscillatorRef.current) {
      ringtoneOscillatorRef.current()
      ringtoneOscillatorRef.current = null
    }
    const targetChat = incomingCall.chatId
    const targetPeer = incomingCall.peerId || ''
    const callType = incomingCall.callType || 'video'
    setIncomingCall(null)
    router.push(`/chat/${targetChat}?autoAnswer=true&peerId=${targetPeer}&type=${callType}`)
  }

  const handleDecline = async () => {
    if (!incomingCall) return
    if (ringtoneOscillatorRef.current) {
      ringtoneOscillatorRef.current()
      ringtoneOscillatorRef.current = null
    }
    const targetChat = incomingCall.chatId
    setIncomingCall(null)
    await signalCall(targetChat, { type: 'call-rejected' }).catch(() => {})
  }

  if (!incomingCall) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(3, 8, 18, 0.94)',
        backdropFilter: 'blur(30px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* Pulsing Radar Ring Container */}
      <div style={{ position: 'relative', width: '140px', height: '140px', marginBottom: '32px' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            border: '2px solid rgba(64, 201, 162, 0.4)',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '-40px',
            borderRadius: '50%',
            border: '1.5px solid rgba(64, 201, 162, 0.2)',
            animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }}
        />
        <div
          className="user-avatar"
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 0 50px rgba(64, 201, 162, 0.5)',
            border: '3px solid var(--earth)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '3rem',
            background: '#07111F',
            color: '#fff',
          }}
        >
          {incomingCall.senderAvatar?.startsWith('http') ? (
            <img
              src={incomingCall.senderAvatar}
              alt={incomingCall.senderName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            incomingCall.senderName.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div
          style={{
            color: 'var(--earth)',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Transmission
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>
          {incomingCall.senderName}
        </h2>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Secure P2P WebRTC Frequency Channel
        </div>
      </div>

      {/* Answer & Decline Controls */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
        {/* Decline */}
        <button
          onClick={handleDecline}
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: '#eb4d4b',
            border: 'none',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(235, 77, 75, 0.4)',
            transition: 'transform 0.2s ease',
          }}
          title="Decline Signal"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Accept */}
        <button
          onClick={handleAccept}
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
            border: 'none',
            color: '#07111F',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 12px 35px rgba(64, 201, 162, 0.5)',
            transition: 'transform 0.2s ease',
            animation: 'pulse 1.5s infinite',
          }}
          title="Accept Signal"
        >
          {incomingCall.callType === 'video' ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
