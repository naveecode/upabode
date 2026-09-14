'use client'

import { useState, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import Link from 'next/link'
import Peer from 'peerjs'
import { UploadButton } from './UploadButton'
import { sendMessage } from '../app/actions'

interface Message {
  id: string
  content: string | null
  mediaUrl?: string | null
  voiceUrl?: string | null
  senderId: string
  createdAt: Date | string
}

interface ChatUser {
  id: string
  username: string | null
  handle: string | null
  avatarUrl?: string | null
  color?: string | null
}

const EMOJIS = ['😀', '😂', '🥺', '😎', '😍', '🤔', '👍', '❤️', '🔥', '✨', '🚀', '👽', '🪐', '☄️', '🛰️']

export default function ChatRoom({ 
  chatId, 
  initialMessages, 
  currentUser, 
  otherUser 
}: { 
  chatId: string
  initialMessages: any[]
  currentUser: any
  otherUser: ChatUser
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [callType, setCallType] = useState<'audio'|'video'|null>(null)
  const [mounted, setMounted] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<Peer | null>(null)

  // Prevent SSR locale hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Setup Pusher Subscription
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'a1d789b8b44c24f2dac8'
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2'
    const pusher = new Pusher(pusherKey, { cluster: pusherCluster })

    const channel = pusher.subscribe(`chat-${chatId}`)

    // ───────── CRITICAL: Prevent Duplicate Message Bug ─────────
    channel.bind('new-message', (data: Message) => {
      setMessages(prev => {
        // 1. If message already exists by real ID, ignore
        if (prev.some(m => m.id === data.id)) return prev

        // 2. If it is sent by the current user, replace the matching temporary optimistic message
        if (data.senderId === currentUser.id) {
          const tempIndex = prev.findIndex(m => 
            m.id.startsWith('temp-') && 
            (
              (m.content && m.content === data.content) || 
              (m.mediaUrl && m.mediaUrl === data.mediaUrl) ||
              (m.voiceUrl && m.voiceUrl === data.voiceUrl)
            )
          )
          if (tempIndex !== -1) {
            const next = [...prev]
            next[tempIndex] = data
            return next
          }
        }

        // 3. Otherwise append new incoming message from the other participant
        return [...prev, data]
      })
    })

    return () => {
      pusher.unsubscribe(`chat-${chatId}`)
    }
  }, [chatId, currentUser?.id])

  // Set up PeerJS Receiver for Incoming Calls
  useEffect(() => {
    if (!currentUser?.id) return
    const peer = new Peer(currentUser.id)
    peerRef.current = peer

    peer.on('call', async (call) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        })
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        call.answer(stream)
        setIsInCall(true)
        setCallType('video')
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
        })
      } catch (err) {
        console.error('Failed to answer call', err)
      }
    })

    return () => {
      peer.destroy()
    }
  }, [currentUser?.id])

  const handleSendText = async () => {
    if (!inputText.trim()) return
    const content = inputText.trim()
    setInputText('')
    setShowEmojiPicker(false)

    // Temporary unique optimistic ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const tempMessage: Message = {
      id: tempId,
      content,
      mediaUrl: null,
      voiceUrl: null,
      senderId: currentUser.id,
      createdAt: new Date()
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await sendMessage(chatId, content)
      if (res?.message) {
        // Upgrade temporary message ID to real DB ID
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
      }
    } catch (e) {
      console.error('Failed to send message', e)
    }
  }

  const handleSendMedia = async (mediaUrl: string) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const tempMessage: Message = {
      id: tempId,
      content: null,
      mediaUrl,
      voiceUrl: null,
      senderId: currentUser.id,
      createdAt: new Date()
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await sendMessage(chatId, '', mediaUrl)
      if (res?.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
      }
    } catch (e) {
      console.error('Failed to send media', e)
    }
  }

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64Audio = reader.result as string
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
          const tempMessage: Message = {
            id: tempId,
            content: '🎤 Voice Transmission',
            voiceUrl: base64Audio,
            senderId: currentUser.id,
            createdAt: new Date()
          }
          setMessages(prev => [...prev, tempMessage])
          const res = await sendMessage(chatId, '🎤 Voice Transmission', base64Audio)
          if (res?.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (e) {
      console.error('Microphone access denied', e)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const startCall = async (type: 'audio' | 'video') => {
    if (!peerRef.current) return
    setIsInCall(true)
    setCallType(type)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video', 
        audio: true 
      })
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const call = peerRef.current.call(otherUser.id, stream)
      if (call) {
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
          }
        })
      }
    } catch (e) {
      console.error('Call failed', e)
      setIsInCall(false)
    }
  }

  const endCall = () => {
    setIsInCall(false)
    setCallType(null)
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const formatMessageTime = (dateInput: Date | string) => {
    if (!mounted) return ''
    try {
      const d = new Date(dateInput)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="chat-room" style={{ height: '100%', minHeight: 'calc(100vh - 76px)' }}>
      {/* Header */}
      <div className="chat-header">
        <Link href="/chat" className="chat-back" title="Back to Signals">
          ←
        </Link>
        <div className="chat-header-info">
          <div className="chat-header-name">{otherUser.username}</div>
          <div className="chat-header-status">@{otherUser.handle} · Signal Active</div>
        </div>
        <div className="chat-call-buttons">
          <button onClick={() => startCall('audio')} className="call-btn" title="Voice Call">
            📞
          </button>
          <button onClick={() => startCall('video')} className="call-btn" title="Video Call">
            📹
          </button>
        </div>
      </div>

      {/* Video Call Overlay */}
      {isInCall && (
        <div className="video-overlay">
          <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.4rem' }}>
            Live Transmission with {otherUser.username}
          </h2>
          <div style={{ color: 'var(--earth)', fontSize: '0.85rem' }}>
            {callType === 'video' ? 'WebRTC Visual Link' : 'WebRTC Audio Channel'}
          </div>
          
          <div className="video-grid">
            <div>
              <video ref={localVideoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
              <div className="video-label">Local Transmitter (You)</div>
            </div>
            <div>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className="video-label">{otherUser.username} (Remote)</div>
            </div>
          </div>

          <div className="video-controls">
            <button onClick={endCall} className="video-control-btn end-call" title="Terminate Call">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div className="messages-container">
        {messages.map(msg => {
          const isMine = msg.senderId === currentUser.id
          return (
            <div 
              key={msg.id} 
              className={`message-bubble ${isMine ? 'message-sent' : 'message-received'}`}
            >
              <div className="message-sender">
                {isMine ? 'You' : otherUser.username}
              </div>
              <div className="message-body">
                {msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="Attached Media" style={{ maxWidth: '100%', borderRadius: '12px' }} />
                )}
                {msg.voiceUrl && (
                  <audio controls src={msg.voiceUrl} style={{ width: '100%', maxWidth: '240px' }} />
                )}
                {msg.content && <p>{msg.content}</p>}
              </div>
              <div className="message-time" suppressHydrationWarning>
                {formatMessageTime(msg.createdAt)}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock */}
      <div className="chat-input-area" style={{ position: 'relative' }}>
        {showEmojiPicker && (
          <div className="emoji-picker">
            {EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => handleEmojiClick(emoji)} className="emoji-btn">
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        <button 
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
          className="chat-action-btn"
          title="Emojis"
        >
          😀
        </button>
        
        {/* Compact Media Upload Button */}
        <div style={{ flexShrink: 0 }} title="Attach Media">
          <UploadButton 
            endpoint="mediaUploader" 
            content={{
              button() {
                return '📎'
              },
              allowedContent() {
                return ''
              }
            }}
            appearance={{
              button: {
                width: '38px',
                height: '38px',
                minWidth: '38px',
                borderRadius: '50%',
                padding: 0,
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--line)',
                color: 'var(--muted)',
                cursor: 'pointer'
              },
              allowedContent: { display: 'none' }
            }}
            onClientUploadComplete={(res: any) => {
              if (res && res[0]) handleSendMedia(res[0].url)
            }}
            onUploadError={(err: Error) => alert(`Upload Error: ${err.message}`)}
          />
        </div>

        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendText()}
          placeholder="Transmit a message..."
          className="chat-input"
        />

        {inputText.trim() ? (
          <button onClick={handleSendText} className="chat-send-btn" title="Send">
            ↗
          </button>
        ) : (
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="chat-action-btn"
            style={{ color: isRecording ? 'var(--danger)' : 'inherit' }}
            title={isRecording ? 'Recording... Release to send' : 'Hold to record voice note'}
          >
            🎤
          </button>
        )}
      </div>
    </div>
  )
}
