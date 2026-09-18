'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Pusher from 'pusher-js'
import Link from 'next/link'
import type { MediaConnection } from 'peerjs'
import { UploadButton, useUploadThing } from './UploadButton'
import { sendMessage, getMessageById, getPostById, signalCall } from '../app/actions'
import { compressImage, validateMediaType } from '../lib/mediaCompressor'
import { haptic, playSendSound } from '../lib/soundAndHaptics'

interface Message {
  id: string
  content: string | null
  mediaUrl?: string | null
  voiceUrl?: string | null
  senderId: string
  createdAt: Date | string
  sender?: {
    id: string
    username: string | null
    handle: string | null
    avatarUrl?: string | null
    color?: string | null
  }
}

function ChatReelCard({ postId }: { postId: string }) {
  const [post, setPost] = useState<any>(null)
  
  useEffect(() => {
    getPostById(postId).then(res => {
      if (res.success) setPost(res.post)
    })
  }, [postId])

  if (!post) return <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--muted)' }}>Loading Reel...</div>

  return (
    <div style={{
      width: '200px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid var(--line)',
      background: '#040a14',
      marginTop: '8px'
    }}>
      <div style={{ position: 'relative', aspectRatio: '9/16' }}>
        {post.mediaUrl ? (
          post.mediaType === 'video' || post.mediaType === 'reel' || post.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || post.mediaUrl.includes('#video') ? (
            <video src={post.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted autoPlay loop playsInline />
          ) : (
            <img src={post.mediaUrl} alt="Reel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )
        ) : (
          <div className={`post-media ${post.mediaType || 'aurora'}`} style={{ width: '100%', height: '100%' }} />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>@{post.author?.handle}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.content}</div>
        </div>
      </div>
      <Link href={`/reels?post=${postId}`} style={{ display: 'block', padding: '8px', textAlign: 'center', background: 'var(--earth)', color: 'var(--background)', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
        View Reel ↗
      </Link>
    </div>
  )
}

interface ChatUser {
  id: string
  username: string | null
  handle: string | null
  avatarUrl?: string | null
  color?: string | null
}

const EMOJIS = ['😀', '😂', '🥺', '😎', '😍', '🤔', '👍', '❤️', '🔥', '✨', '🚀', '👽', '🪐', '☄️', '🛰️', '📡', '🌌', '🛸', '⭐', '💫']

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
}

// Smooth Media Component with Shimmer Loading Placeholder & Smooth Fade-in
function SmoothChatMedia({
  src,
  onFullscreen
}: {
  src: string
  onFullscreen: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const isVideo = src.endsWith('.mp4') || src.includes('video') || src.includes('#video')

  return (
    <div
      onClick={onFullscreen}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '160px',
        maxHeight: '300px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.2)',
        cursor: 'pointer'
      }}
    >
      {!loaded && (
        <div
          className="chat-media-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          <div style={{ color: 'var(--earth)', opacity: 0.7 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        </div>
      )}

      {isVideo ? (
        <video
          src={src}
          controls
          playsInline
          onLoadedData={() => setLoaded(true)}
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'cover',
            borderRadius: '12px',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.35s ease-in-out'
          }}
        />
      ) : (
        <img
          src={src}
          alt="Attached transmission"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'cover',
            borderRadius: '12px',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.35s ease-in-out'
          }}
        />
      )}
    </div>
  )
}

// Synthesizes a WhatsApp/Phone harmonic ringtone using Web Audio API
class CallRingtoneManager {
  private audioCtx: AudioContext | null = null
  private isRinging = false
  private ringInterval: any = null

  start() {
    if (this.isRinging) return
    this.isRinging = true

    const playToneBurst = () => {
      if (!this.isRinging) return
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioContextClass()
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume()
        }

        const now = this.audioCtx.currentTime
        // Dual-tone harmonic chord: 440Hz + 480Hz WhatsApp cadence
        const osc1 = this.audioCtx.createOscillator()
        const osc2 = this.audioCtx.createOscillator()
        const gainNode = this.audioCtx.createGain()

        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(440, now)
        osc2.frequency.setValueAtTime(480, now)

        gainNode.gain.setValueAtTime(0, now)
        // Pulse 1: 0 to 0.4s
        gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05)
        gainNode.gain.linearRampToValueAtTime(0, now + 0.4)
        // Pulse 2: 0.5s to 1.1s
        gainNode.gain.linearRampToValueAtTime(0.18, now + 0.55)
        gainNode.gain.linearRampToValueAtTime(0, now + 1.1)

        osc1.connect(gainNode)
        osc2.connect(gainNode)
        gainNode.connect(this.audioCtx.destination)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + 1.15)
        osc2.stop(now + 1.15)
      } catch (err) {
        console.warn('Ringtone notice:', err)
      }

      // Device vibration pattern (WhatsApp cadence)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([400, 200, 600, 1800])
        } catch (e) {}
      }
    }

    playToneBurst()
    this.ringInterval = setInterval(playToneBurst, 3000)
  }

  stop() {
    this.isRinging = false
    if (this.ringInterval) {
      clearInterval(this.ringInterval)
      this.ringInterval = null
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close()
      } catch (e) {}
      this.audioCtx = null
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0)
      } catch (e) {}
    }
  }
}

const callRingtone = new CallRingtoneManager()

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
  const safeOtherUser: ChatUser = {
    id: otherUser?.id || '',
    username: otherUser?.username || otherUser?.handle || 'Astronaut',
    handle: otherUser?.handle || otherUser?.username || 'astronaut',
    avatarUrl: otherUser?.avatarUrl || null,
    color: otherUser?.color || 'green'
  }

  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages || [])
  const [inputText, setInputText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showChatOptions, setShowChatOptions] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  
  // Call States
  const [isInCall, setIsInCall] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoDisabled, setIsVideoDisabled] = useState(false)
  const [swappedPiP, setSwappedPiP] = useState(false)
  const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<{ call: MediaConnection; isVideo: boolean } | null>(null)
  const [incomingCallSignal, setIncomingCallSignal] = useState<{
    senderId: string
    senderName: string
    callType: 'audio' | 'video'
    peerId: string
  } | null>(null)
  
  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<any>(null)
  const activeCallRef = useRef<MediaConnection | null>(null)

  const { startUpload } = useUploadThing('mediaUploader', {
    onClientUploadComplete: (res: any) => {
      if (res && res[0]) {
        const isVideo = res[0].name?.match(/\.(mp4|webm|ogg|mov)$/i) || res[0].type?.includes('video');
        handleSendMedia(isVideo ? `${res[0].url}#video` : res[0].url);
      }
      setIsUploadingMedia(false)
    },
    onUploadError: (err: Error) => {
      alert(`Upload error: ${err.message}`)
      setIsUploadingMedia(false)
    }
  })

  const handleMediaFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateMediaType(file)
    if (!validation.valid) {
      alert(validation.error || 'Please select a valid media file.')
      return
    }
    try {
      setIsUploadingMedia(true)
      let fileToUpload = file
      if (validation.type === 'image') {
        fileToUpload = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.88 })
      }
      await startUpload([fileToUpload])
    } catch (err: any) {
      alert('Media upload failed: ' + err.message)
      setIsUploadingMedia(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    document.body.classList.add('chat-room-active')
    return () => {
      document.body.classList.remove('chat-room-active')
      callRingtone.stop()
    }
  }, [])

  useEffect(() => {
    if (incomingCall || incomingCallSignal) {
      callRingtone.start()
    } else {
      callRingtone.stop()
    }
  }, [incomingCall, incomingCallSignal])

  // Auto-scroll messages to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages.length, scrollToBottom])

  // Attach local and remote streams to video elements whenever stream or call status changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, isInCall, swappedPiP])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, isInCall, swappedPiP])

  // Call duration counter
  useEffect(() => {
    if (isInCall && callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [isInCall, callStatus])

  // ───────── Setup Pusher Subscription ─────────
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'a1d789b8b44c24f2dac8'
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2'
    const pusher = new Pusher(pusherKey, { cluster: pusherCluster })

    const channel = pusher.subscribe(`chat-${chatId}`)

    channel.bind('new-message', async (data: any) => {
      // If the payload was too large for Pusher, fetch the full message from DB
      let fullMessage = data
      if (data.requiresFetch && data.id) {
        const fetched = await getMessageById(data.id)
        if (fetched) fullMessage = fetched
      }

      setMessages(prev => {
        // 1. If message already exists by real ID, replace or ignore
        if (prev.some(m => m.id === fullMessage.id)) {
          return prev.map(m => m.id === fullMessage.id ? fullMessage : m)
        }

        // 2. If it's sent by current user, replace matching temporary message
        if (fullMessage.senderId === currentUser.id) {
          const tempIndex = prev.findIndex(m => 
            m.id.startsWith('temp-') && 
            (
              (m.content && m.content === fullMessage.content) || 
              (m.mediaUrl && m.mediaUrl === fullMessage.mediaUrl) ||
              (m.voiceUrl && m.voiceUrl === fullMessage.voiceUrl)
            )
          )
          if (tempIndex !== -1) {
            const next = [...prev]
            next[tempIndex] = fullMessage
            return next
          }
        }

        // 3. Otherwise append new incoming message
        return [...prev, fullMessage]
      })
    })

    channel.bind('call-signal', async (data: any) => {
      if (!data || data.senderId === currentUser.id) return

      if (data.type === 'call-offer') {
        setIncomingCallSignal({
          senderId: data.senderId,
          senderName: data.senderName || safeOtherUser.username,
          callType: data.callType || 'audio',
          peerId: data.peerId
        })
      } else if (data.type === 'call-answer') {
        setCallStatus('connected')
      } else if (data.type === 'call-ended' || data.type === 'call-rejected') {
        setIncomingCallSignal(null)
        setIncomingCall(null)
        endCall(false)
      }
    })

    return () => {
      pusher.unsubscribe(`chat-${chatId}`)
    }
  }, [chatId, currentUser?.id])

  // ───────── PeerJS WebRTC Setup ─────────
  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return

    let peerInstance: any = null
    let isCancelled = false

    const initPeer = async () => {
      try {
        const PeerModule: any = await import('peerjs')
        if (isCancelled) return

        const PeerConstructor = PeerModule.Peer || PeerModule.default?.Peer || PeerModule.default || PeerModule
        if (typeof PeerConstructor !== 'function') {
          console.warn('PeerJS constructor could not be resolved')
          return
        }

        const peerId = `orbit-${currentUser.id.replace(/[^a-zA-Z0-9]/g, '')}`
        const peer = new PeerConstructor(peerId, PEER_CONFIG)
        peerRef.current = peer
        peerInstance = peer

        peer.on('open', (id: string) => {
          console.log('PeerJS online with ID:', id)
        })

        peer.on('error', (err: any) => {
          console.warn('PeerJS status:', err)
        })

        peer.on('call', (incomingMediaCall: any) => {
          const isVideo = incomingMediaCall.metadata?.callType !== 'audio'
          setIncomingCall({ call: incomingMediaCall, isVideo })
        })
      } catch (e) {
        console.error('Failed to initialize PeerJS:', e)
      }
    }

    initPeer()

    return () => {
      isCancelled = true
      if (peerInstance) peerInstance.destroy()
    }
  }, [currentUser?.id])

  // Answer Incoming Call
  const handleAnswerCall = async () => {
    callRingtone.stop()
    const isVideo = incomingCall ? incomingCall.isVideo : incomingCallSignal?.callType === 'video'
    const targetPeerId = incomingCallSignal?.peerId || `orbit-${safeOtherUser.id.replace(/[^a-zA-Z0-9]/g, '')}`

    setCallType(isVideo ? 'video' : 'audio')
    setIsInCall(true)
    setCallStatus('connecting')
    setIncomingCallSignal(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      setLocalStream(stream)

      // Signal caller via Pusher that call has been accepted
      await signalCall(chatId, {
        type: 'call-answer',
        peerId: `orbit-${currentUser.id.replace(/[^a-zA-Z0-9]/g, '')}`
      })

      if (incomingCall?.call) {
        incomingCall.call.answer(stream)
        incomingCall.call.on('stream', (rStream: any) => {
          setRemoteStream(rStream)
          setCallStatus('connected')
        })
        incomingCall.call.on('close', () => endCall(true))
        incomingCall.call.on('error', () => endCall(true))
        activeCallRef.current = incomingCall.call
      } else if (peerRef.current) {
        const call = peerRef.current.call(targetPeerId, stream, {
          metadata: { callType: isVideo ? 'video' : 'audio' }
        })
        activeCallRef.current = call
        if (call) {
          call.on('stream', (rStream: any) => {
            setRemoteStream(rStream)
            setCallStatus('connected')
          })
          call.on('close', () => endCall(true))
          call.on('error', () => endCall(true))
        }
      }
      setIncomingCall(null)
    } catch (err) {
      console.error('Failed to answer call:', err)
      endCall(true)
    }
  }

  // Reject Incoming Call
  const handleRejectCall = async () => {
    callRingtone.stop()
    if (incomingCall) {
      incomingCall.call.close()
      setIncomingCall(null)
    }
    setIncomingCallSignal(null)
    await signalCall(chatId, { type: 'call-rejected' })
  }

  // Start Outgoing Call
  const startCall = async (type: 'audio' | 'video') => {
    if (!safeOtherUser?.id) return

    setIsInCall(true)
    setCallType(type)
    setCallStatus('connecting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      setLocalStream(stream)

      const myPeerId = `orbit-${currentUser.id.replace(/[^a-zA-Z0-9]/g, '')}`
      const targetPeerId = `orbit-${safeOtherUser.id.replace(/[^a-zA-Z0-9]/g, '')}`

      // Instantly alert recipient via Pusher
      await signalCall(chatId, {
        type: 'call-offer',
        callType: type,
        peerId: myPeerId
      })

      if (peerRef.current) {
        const call = peerRef.current.call(targetPeerId, stream, {
          metadata: { callType: type }
        })
        activeCallRef.current = call

        if (call) {
          call.on('stream', (rStream: any) => {
            setRemoteStream(rStream)
            setCallStatus('connected')
          })
          call.on('close', () => endCall(true))
          call.on('error', () => endCall(true))
        }
      }
    } catch (err) {
      console.error('Call initialization failed:', err)
      alert('Could not access camera/microphone. Please grant permissions.')
      endCall(true)
    }
  }

  // Terminate Call & Clean Up Hardware Tracks
  const endCall = async (notifyPeer = true) => {
    callRingtone.stop()
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop())
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop())
    }
    if (activeCallRef.current) {
      activeCallRef.current.close()
      activeCallRef.current = null
    }

    setLocalStream(null)
    setRemoteStream(null)
    setIsInCall(false)
    setCallType(null)
    setCallStatus('connecting')
    setIsMuted(false)
    setIsVideoDisabled(false)
    setSwappedPiP(false)
    setIncomingCall(null)
    setIncomingCallSignal(null)

    if (notifyPeer) {
      await signalCall(chatId, { type: 'call-ended' })
    }
  }

  // Toggle Mute Mic
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsMuted(prev => !prev)
    }
  }

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsVideoDisabled(prev => !prev)
    }
  }

  // Send Text Message
  const handleSendText = async () => {
    if (!inputText.trim()) return
    const content = inputText.trim()
    setInputText('')
    setShowEmojiPicker(false)
    haptic(14)
    playSendSound()

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const tempMessage: Message = {
      id: tempId,
      content,
      mediaUrl: null,
      voiceUrl: null,
      senderId: currentUser.id,
      createdAt: new Date(),
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        handle: currentUser.handle,
        avatarUrl: currentUser.avatarUrl,
        color: currentUser.color,
      }
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await sendMessage(chatId, content)
      if (res?.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
      }
    } catch (e) {
      console.error('Failed to send message:', e)
    }
  }

  // Send Media Image
  const handleSendMedia = async (mediaUrl: string) => {
    haptic(14)
    playSendSound()
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const tempMessage: Message = {
      id: tempId,
      content: null,
      mediaUrl,
      voiceUrl: null,
      senderId: currentUser.id,
      createdAt: new Date(),
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        handle: currentUser.handle,
      }
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await sendMessage(chatId, '', mediaUrl)
      if (res?.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
      }
    } catch (e) {
      console.error('Failed to send media:', e)
    }
  }

  // Emoji Click
  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji)
  }

  const isRecordingRef = useRef(false)

  // Toggle Voice Note Recording
  const toggleRecording = async () => {
    if (isRecordingRef.current) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
      setIsRecording(false)
      isRecordingRef.current = false
      return
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingDuration(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        
        // Prevent sending empty recordings (less than 1 chunk or very short)
        if (audioChunksRef.current.length === 0) return

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64Audio = reader.result as string
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
          const tempMessage: Message = {
            id: tempId,
            content: 'Voice Transmission',
            voiceUrl: base64Audio,
            senderId: currentUser.id,
            createdAt: new Date(),
          }
          setMessages(prev => [...prev, tempMessage])
          
          const res = await sendMessage(chatId, 'Voice Transmission', null, base64Audio)
          if (res?.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? res.message : m))
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      isRecordingRef.current = true
    } catch (e) {
      console.error('Microphone access denied:', e)
      alert('Could not access microphone. Please grant permission.')
      setIsRecording(false)
      isRecordingRef.current = false
    }
  }

  // Format Duration seconds -> MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  // Format Message Time
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
    <div 
      className="chat-room-container" 
      data-hide-chrome="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '0px',
        boxShadow: 'var(--shadow)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* ───────── Top Header ───────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid var(--line)',
        background: 'rgba(7, 17, 31, 0.92)',
        backdropFilter: 'blur(20px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/chat')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Back to Signals"
          >
            ←
          </button>

          <div 
            className={`user-avatar ${safeOtherUser.color || 'green'}`}
            style={{
              width: '42px',
              height: '42px',
              minWidth: '42px',
              minHeight: '42px',
              maxWidth: '42px',
              maxHeight: '42px',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: safeOtherUser.color === 'orange'
                ? 'linear-gradient(135deg, var(--mars), #8a2be2)'
                : safeOtherUser.color === 'blue'
                ? 'linear-gradient(135deg, #00c6ff, #0072ff)'
                : 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            {safeOtherUser.avatarUrl?.startsWith?.('http') ? (
              <img 
                src={safeOtherUser.avatarUrl} 
                style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', aspectRatio: '1 / 1', borderRadius: '50%', objectFit: 'cover', display: 'block' }} 
                alt='avatar' 
              />
            ) : (
              safeOtherUser.avatarUrl || safeOtherUser.username?.charAt(0).toUpperCase() || '✦'
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>{safeOtherUser.username}<span style={{ fontSize: '0.65rem', background: 'rgba(64, 201, 162, 0.1)', color: 'var(--earth)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--earth)', letterSpacing: '0.05em' }}>E2E ENCRYPTED</span></div>
            <div style={{ color: 'var(--earth)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--earth)', display: 'inline-block' }}></span>
              @{safeOtherUser.handle} · Signal Active
            </div>
          </div>
        </div>

        {/* Video & Audio Call Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => startCall('audio')}
            disabled={isInCall}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--line)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text)',
              display: 'grid',
              placeItems: 'center',
              cursor: isInCall ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
            }}
            title="Encrypted Voice Call"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button
            onClick={() => startCall('video')}
            disabled={isInCall}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--line)',
              background: 'linear-gradient(135deg, rgba(64, 201, 162, 0.2), rgba(64, 201, 162, 0.05))',
              borderColor: 'rgba(64, 201, 162, 0.4)',
              color: 'var(--earth)',
              display: 'grid',
              placeItems: 'center',
              cursor: isInCall ? 'not-allowed' : 'pointer',
              fontSize: '1.15rem',
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
            }}
            title="Quantum P2P Video Call"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ───────── WhatsApp-Style Fullscreen Incoming Call Alert ───────── */}
      {(incomingCall || incomingCallSignal) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, #0f243d 0%, #050b14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 24px 80px',
          zIndex: 99999,
          backdropFilter: 'blur(20px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {/* Top caller info */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(64, 201, 162, 0.15)',
              border: '1px solid rgba(64, 201, 162, 0.3)',
              color: 'var(--earth)',
              fontSize: '0.82rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--earth)', animation: 'pulse 1.2s infinite' }} />
              Incoming {(incomingCall ? incomingCall.isVideo : incomingCallSignal?.callType === 'video') ? 'Video Call' : 'Audio Call'}
            </div>

            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#f3f7fb', letterSpacing: '-0.02em' }}>
              {incomingCallSignal?.senderName || safeOtherUser.username}
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
              @{safeOtherUser.handle}
            </p>
          </div>

          {/* Pulsing Avatar in Center */}
          <div style={{ position: 'relative', display: 'grid', placeItems: 'center', margin: '40px 0' }}>
            {/* Outer pulsating wave rings */}
            <div style={{
              position: 'absolute',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: '2px solid rgba(64, 201, 162, 0.35)',
              animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
            }} />
            <div style={{
              position: 'absolute',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '2px solid rgba(64, 201, 162, 0.5)',
              animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />

            {/* Avatar Circle */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: safeOtherUser.avatarUrl ? `url(${safeOtherUser.avatarUrl}) center/cover` : (safeOtherUser.color || 'linear-gradient(135deg, #1e3a5f, #0c1829)'),
              border: '3px solid var(--earth)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 40px rgba(64, 201, 162, 0.4)',
              zIndex: 2,
              overflow: 'hidden'
            }}>
              {!safeOtherUser.avatarUrl && (
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white' }}>
                  {(safeOtherUser.username?.[0] || 'U').toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Action Controls (Decline / Accept) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '50px', width: '100%', maxWidth: '340px' }}>
            {/* Decline Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleRejectCall}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff4d61, #d62839)',
                  border: 'none',
                  color: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(214, 40, 57, 0.5)',
                  transition: 'transform 0.15s ease'
                }}
                onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                title="Decline Call"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
              </button>
              <span style={{ fontSize: '0.8rem', color: '#ff6b7a', fontWeight: 600 }}>Decline</span>
            </div>

            {/* Accept Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleAnswerCall}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #40c9a2, #299e7d)',
                  border: 'none',
                  color: '#07111f',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 25px rgba(64, 201, 162, 0.6)',
                  animation: 'pulse 1.4s infinite',
                  transition: 'transform 0.15s ease'
                }}
                onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                title="Accept Call"
              >
                {(incomingCall ? incomingCall.isVideo : incomingCallSignal?.callType === 'video') ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                )}
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--earth)', fontWeight: 600 }}>Accept</span>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Fullscreen Picture-in-Picture Video Call Overlay ───────── */}
      {isInCall && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#040911',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden'
        }}>
          {/* Top Bar Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '24px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
            zIndex: 30
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                minWidth: '42px',
                minHeight: '42px',
                borderRadius: '50%',
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                flexShrink: 0,
                background: 'var(--earth)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                color: 'var(--background)'
              }}>
                {safeOtherUser.avatarUrl?.startsWith?.('http') ? <img src={safeOtherUser.avatarUrl} style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', aspectRatio: '1 / 1', borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt='avatar' /> : (safeOtherUser.avatarUrl || safeOtherUser.username?.charAt(0).toUpperCase())}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem' }}>
                  {safeOtherUser.username}
                </div>
                <div style={{ color: 'var(--earth)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--earth)' }}></span>
                  {callStatus === 'connected' ? `Live · ${formatDuration(callDuration)}` : 'Connecting quantum relay...'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0,0,0,0.08)',
              padding: '6px 14px',
              borderRadius: '100px',
              color: 'var(--muted)',
              fontSize: '0.78rem',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                E2E WebRTC
              </span>
            </div>
          </div>

          {/* MAIN SCREEN (Remote Participant by default) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background)'
          }}>
            {callType === 'video' ? (
              swappedPiP ? (
                // If swapped, local video is on main screen
                <video
                  ref={(el) => {
                    if (el && localStream && el.srcObject !== localStream) el.srcObject = localStream;
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              ) : (
                // Remote video is on main screen
                remoteStream ? (
                  <video
                    ref={(el) => {
                      if (el && remoteStream && el.srcObject !== remoteStream) el.srcObject = remoteStream;
                    }}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                        <path d="M2 12h20"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '1.2rem', color: 'white', fontWeight: 600, marginBottom: '6px' }}>
                      Establishing Optical Link...
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>Waiting for {otherUser.username} to beam video stream</div>
                  </div>
                )
              )
            ) : (
              // Audio Call Visualizer
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  minWidth: '120px',
                  minHeight: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  aspectRatio: '1 / 1',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '3.5rem',
                  color: 'var(--background)',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 50px rgba(64, 201, 162, 0.4)',
                  animation: 'pulse 2s infinite'
                }}>
                  {otherUser.avatarUrl?.startsWith?.('http') ? <img src={otherUser.avatarUrl} style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', aspectRatio: '1 / 1', borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt='avatar' /> : (otherUser.avatarUrl || otherUser.username?.charAt(0).toUpperCase())}
                </div>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '6px' }}>{otherUser.username}</h2>
                <p style={{ color: 'var(--earth)', fontSize: '0.9rem' }}>
                  {callStatus === 'connected' ? `Audio Channel Active (${formatDuration(callDuration)})` : 'Calling astronaut...'}
                </p>
                {/* Hidden audio element for remote stream during audio-only calls */}
                {remoteStream && (
                  <audio
                    ref={(audioElement) => {
                      if (audioElement && audioElement.srcObject !== remoteStream) {
                        audioElement.srcObject = remoteStream;
                      }
                    }}
                    autoPlay
                    playsInline
                  />
                )}
              </div>
            )}
          </div>

          {/* PICTURE-IN-PICTURE (PiP) FLOATING WINDOW */}
          {callType === 'video' && (
            <div
              onClick={() => setSwappedPiP(!swappedPiP)}
              title="Click to swap camera views"
              style={{
                position: 'absolute',
                bottom: '100px',
                right: '24px',
                width: '150px',
                height: '210px',
                borderRadius: '18px',
                overflow: 'hidden',
                border: '2.5px solid rgba(64, 201, 162, 0.8)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                cursor: 'pointer',
                zIndex: 40,
                background: '#0b1727',
                transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {swappedPiP ? (
                // Remote is in PiP
                remoteStream ? (
                  <video
                    ref={(el) => {
                      if (el && remoteStream && el.srcObject !== remoteStream) el.srcObject = remoteStream;
                    }}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: '0.75rem' }}>
                    Connecting...
                  </div>
                )
              ) : (
                // Local is in PiP
                <video
                  ref={(el) => {
                    if (el && localStream && el.srcObject !== localStream) el.srcObject = localStream;
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              )}
              <div style={{
                position: 'absolute',
                bottom: '6px',
                left: '8px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600,
                backdropFilter: 'blur(4px)'
              }}>
                {swappedPiP ? otherUser.username : 'You'}
              </div>
            </div>
          )}

          {/* BOTTOM FLOATING CONTROLS */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            zIndex: 50
          }}>
            {/* Mic Toggle */}
            <button
              onClick={toggleMute}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                background: isMuted ? 'rgba(255, 107, 122, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                color: isMuted ? 'var(--danger)' : 'white',
                fontSize: '1.3rem',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                backdropFilter: 'blur(16px)',
                borderWidth: isMuted ? '1px' : '0px',
                borderColor: 'var(--danger)',
                transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
              }}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              )}
            </button>

            {/* Video Camera Toggle */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isVideoDisabled ? 'rgba(255, 107, 122, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                  color: isVideoDisabled ? 'var(--danger)' : 'white',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  backdropFilter: 'blur(16px)',
                  borderWidth: isVideoDisabled ? '1px' : '0px',
                  borderColor: 'var(--danger)',
                  transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                }}
                title={isVideoDisabled ? 'Turn On Camera' : 'Turn Off Camera'}
              >
                {isVideoDisabled ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m4 0h6a2 2 0 0 1 2 2v3"/><polygon points="23 7 16 12 23 17 23 7"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                )}
              </button>
            )}

            {/* Swap PiP View Button */}
            {callType === 'video' && (
              <button
                onClick={() => setSwappedPiP(!swappedPiP)}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  backdropFilter: 'blur(16px)',
                  transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                }}
                title="Swap Camera View"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              </button>
            )}

            {/* Hang Up Button */}
            <button
              onClick={endCall}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--danger)',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 8px 30px rgba(255, 107, 122, 0.5)',
                transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
              }}
              title="Terminate Call"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ───────── Messages Scroll Container ───────── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,0,0,0.08) transparent'
      }}>
        {messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--muted)',
            padding: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                <path d="M2 12h20"/>
              </svg>
            </div>
            Quantum channel connected with <strong>{safeOtherUser.username}</strong>.<br />
            Transmit your first signal below.
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === currentUser.id
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  animation: 'fadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease-out'
                }}
              >
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--muted)',
                  marginBottom: '3px',
                  alignSelf: isMine ? 'flex-end' : 'flex-start'
                }}>
                  {isMine ? 'You' : (msg.sender?.username || safeOtherUser.username)}
                </span>

                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px',
                  borderBottomRightRadius: isMine ? '4px' : '18px',
                  borderBottomLeftRadius: isMine ? '18px' : '4px',
                  background: isMine
                    ? 'linear-gradient(135deg, var(--earth), var(--earth-dark))'
                    : 'rgba(0,0,0,0.06)',
                  color: isMine ? 'var(--background)' : 'var(--text)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  {/* Media / Image */}
                  {msg.mediaUrl && (
                    <div style={{ marginBottom: msg.content ? '8px' : 0 }}>
                      <SmoothChatMedia
                        src={msg.mediaUrl}
                        onFullscreen={() => setFullscreenMedia(msg.mediaUrl || null)}
                      />
                    </div>
                  )}

                  {/* Voice Note Player */}
                  {msg.voiceUrl && (
                    <div style={{ marginBottom: msg.content ? '6px' : 0, minWidth: '220px' }}>
                      <audio
                        controls
                        src={msg.voiceUrl}
                        style={{ width: '100%', height: '36px', outline: 'none' }}
                      />
                    </div>
                  )}

                  {/* Text Content & Reel Cards */}
                  {msg.content && (
                    msg.content.startsWith('[REEL:') && msg.content.endsWith(']') ? (
                      <ChatReelCard postId={msg.content.replace('[REEL:', '').replace(']', '')} />
                    ) : (
                      <p style={{ margin: 0, fontWeight: isMine ? 500 : 400 }}>{msg.content}</p>
                    )
                  )}
                </div>

                <span style={{
                  fontSize: '0.66rem',
                  color: 'var(--muted)',
                  marginTop: '3px',
                  alignSelf: isMine ? 'flex-end' : 'flex-start'
                }} suppressHydrationWarning>
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ───────── Input Dock ───────── */}
      <div style={{
        position: 'relative',
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--line)',
        background: 'var(--panel-solid)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 10,
        flexShrink: 0
      }}>
        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '12px',
            right: '12px',
            maxWidth: '300px',
            margin: '0 auto 10px',
            background: 'var(--panel-solid)',
            border: '1px solid var(--line)',
            borderRadius: '18px',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            boxShadow: 'var(--shadow)',
            zIndex: 60,
            backdropFilter: 'blur(20px)'
          }}>
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                style={{
                  fontSize: '1.3rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '1px solid var(--line)',
            background: showEmojiPicker ? 'rgba(64, 201, 162, 0.2)' : 'rgba(0,0,0,0.04)',
            color: showEmojiPicker ? 'var(--earth)' : 'var(--muted)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            transition: '0.2s ease'
          }}
          title="Pick Emoji"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        {/* Media Upload Button */}
        <label
          style={{
            flexShrink: 0,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: isUploadingMedia ? 'rgba(197, 160, 89, 0.2)' : 'rgba(0,0,0,0.04)',
            border: '1px solid var(--line)',
            color: isUploadingMedia ? 'var(--earth)' : 'var(--muted)',
            cursor: isUploadingMedia ? 'wait' : 'pointer',
            transition: '0.2s ease'
          }}
          title={isUploadingMedia ? 'Optimizing & uploading media...' : 'Attach Image or Video Transmission'}
        >
          {isUploadingMedia ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="chat-spin" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          )}
          <input
            type="file"
            accept="image/*,video/*"
            disabled={isUploadingMedia}
            style={{ display: 'none' }}
            onChange={handleMediaFilePick}
          />
        </label>

        {/* Message Input or Voice Recording Indicator */}
        {isRecording ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 18px',
            borderRadius: '100px',
            background: 'rgba(255, 107, 122, 0.15)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)'
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--danger)',
              animation: 'pulse 1s infinite'
            }}></span>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
              Recording voice note... {formatDuration(recordingDuration)}
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Transmit an encrypted signal..."
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '100px',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              fontSize: '0.92rem',
              outline: 'none',
              transition: 'border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--earth)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
          />
        )}

        {/* Send Button or Hold-to-record Button */}
        {inputText.trim() ? (
          <button
            onClick={handleSendText}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
              color: 'var(--background)',
              border: 'none',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(64, 201, 162, 0.4)',
              transition: 'transform 0.15s ease'
            }}
            title="Send Signal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={toggleRecording}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isRecording ? 'var(--danger)' : 'rgba(0,0,0,0.04)',
              border: '1px solid var(--line)',
              color: isRecording ? 'white' : 'var(--muted)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
            }}
            title={isRecording ? 'Click to beam voice log' : 'Click to record voice transmission'}
          >
            {isRecording ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Fullscreen Media Overlay */}
      {fullscreenMedia && (
        <div 
          onClick={() => setFullscreenMedia(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <button 
            onClick={() => setFullscreenMedia(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0,0,0,0.08)',
              border: 'none',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              fontSize: '1.2rem',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            ✕
          </button>
          {fullscreenMedia.endsWith('.mp4') || fullscreenMedia.includes('video') ? (
            <video 
              src={fullscreenMedia} 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              controls 
              autoPlay 
            />
          ) : (
            <img 
              src={fullscreenMedia} 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              alt="Fullscreen Media"
            />
          )}
        </div>
      )}
    </div>
  )
}




