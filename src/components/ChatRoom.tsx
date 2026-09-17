'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'
import Link from 'next/link'
import type { MediaConnection } from 'peerjs'
import { UploadButton, useUploadThing } from './UploadButton'
import { sendMessage, getMessageById, getPostById, signalCall } from '../app/actions'
import { compressImage, validateMediaType } from '../lib/mediaCompressor'

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
  }, [])

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
            content: '🎤 Voice Transmission',
            voiceUrl: base64Audio,
            senderId: currentUser.id,
            createdAt: new Date(),
          }
          setMessages(prev => [...prev, tempMessage])
          
          const res = await sendMessage(chatId, '🎤 Voice Transmission', null, base64Audio)
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
    <div className="chat-room-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow)',
      backdropFilter: 'blur(20px)'
    }}>
      {/* ───────── Top Header ───────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--line)',
        background: 'rgba(7, 17, 31, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/chat"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text)',
              textDecoration: 'none',
              fontSize: '1.1rem',
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
            }}
            title="Back to Signals"
          >
            ←
          </Link>

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
            📞
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
            📹
          </button>
        </div>
      </div>

      {/* ───────── Incoming Call Alert Modal ───────── */}
      {(incomingCall || incomingCallSignal) && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(11, 23, 39, 0.96)',
          border: '2px solid var(--earth)',
          borderRadius: '20px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          zIndex: 100,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'var(--earth)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.4rem',
            animation: 'pulse 1.5s infinite'
          }}>
            {(incomingCall ? incomingCall.isVideo : incomingCallSignal?.callType === 'video') ? '📹' : '📞'}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Incoming {(incomingCall ? incomingCall.isVideo : incomingCallSignal?.callType === 'video') ? 'Video' : 'Audio'} Transmission
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
              From {incomingCallSignal?.senderName || safeOtherUser.username} (@{safeOtherUser.handle})
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAnswerCall}
              style={{
                padding: '9px 18px',
                borderRadius: '100px',
                background: 'var(--earth)',
                color: 'var(--background)',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Accept
            </button>
            <button
              onClick={handleRejectCall}
              style={{
                padding: '9px 18px',
                borderRadius: '100px',
                background: 'var(--danger)',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Decline
            </button>
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
              <span>🔒 E2E WebRTC</span>
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
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📡</div>
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
              {isMuted ? '🔇' : '🎤'}
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
                {isVideoDisabled ? '🚫' : '📹'}
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
                🔄
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
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🛰️</span>
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
                    <div style={{ marginBottom: msg.content ? '8px' : 0, cursor: 'pointer' }} onClick={() => setFullscreenMedia(msg.mediaUrl || null)}>
                      {msg.mediaUrl.endsWith('.mp4') || msg.mediaUrl.includes('video') ? (
                        <video
                          src={msg.mediaUrl}
                          style={{
                            width: '100%',
                            maxHeight: '300px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            display: 'block'
                          }}
                          controls
                        />
                      ) : (
                        <img
                          src={msg.mediaUrl}
                          alt="Attached transmission"
                          style={{
                            width: '100%',
                            maxHeight: '300px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            display: 'block'
                          }}
                        />
                      )}
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
            color: 'var(--text)',
            fontSize: '1.15rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
          title="Pick Emoji"
        >
          😀
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
            fontSize: '1.15rem',
            cursor: isUploadingMedia ? 'wait' : 'pointer',
            transition: '0.2s ease'
          }}
          title={isUploadingMedia ? 'Optimizing & uploading media...' : 'Attach Image or Video Transmission'}
        >
          {isUploadingMedia ? '⏳' : '📎'}
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
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(64, 201, 162, 0.4)'
            }}
            title="Send Signal"
          >
            ↗
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
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
            }}
            title={isRecording ? 'Click to beam voice log' : 'Click to record voice transmission'}
          >
            {isRecording ? '⏹' : '🎤'}
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




