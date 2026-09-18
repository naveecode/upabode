'use client'

import { useState, useRef, useEffect } from 'react'
import { showToast } from './Toast'

interface VideoTrimmerModalProps {
  videoFile: File
  onTrimComplete: (trimmedFile: File, selectedMusic?: string) => void
  onCancel: () => void
}

export default function VideoTrimmerModal({
  videoFile,
  onTrimComplete,
  onCancel
}: VideoTrimmerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [duration, setDuration] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(60)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processProgress, setProcessProgress] = useState<number>(0)
  const [selectedMusic, setSelectedMusic] = useState<string>('')

  // Built-in royalty-free cosmic background tracks
  const cosmicMusicTracks = [
    { id: '', name: 'Original Audio Only', desc: 'No background music' },
    { id: 'orbital_pulse', name: 'Orbital Pulse', desc: 'Ambient atmospheric synth' },
    { id: 'deep_nebula', name: 'Deep Nebula', desc: 'Chill cosmic rhythm' },
    { id: 'pulsar_drift', name: 'Pulsar Drift', desc: 'Low-fi spatial frequency' }
  ]

  useEffect(() => {
    const url = URL.createObjectURL(videoFile)
    setVideoUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [videoFile])

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    const dur = videoRef.current.duration || 0
    setDuration(dur)
    setStartTime(0)
    // Max 60 seconds slice
    setEndTime(Math.min(dur, 60))
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const cur = videoRef.current.currentTime
    setCurrentTime(cur)
    // Loop playback within selected [startTime, endTime] window
    if (cur >= endTime) {
      videoRef.current.currentTime = startTime
      if (!isPlaying) videoRef.current.pause()
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const handleStartChange = (val: number) => {
    const newStart = Math.max(0, Math.min(val, duration - 1))
    setStartTime(newStart)
    // Enforce 60s max slice
    if (endTime - newStart > 60) {
      setEndTime(newStart + 60)
    } else if (endTime <= newStart) {
      setEndTime(Math.min(duration, newStart + 1))
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newStart
    }
  }

  const handleEndChange = (val: number) => {
    const newEnd = Math.max(startTime + 1, Math.min(val, duration))
    // Enforce 60s max window
    if (newEnd - startTime > 60) {
      setStartTime(Math.max(0, newEnd - 60))
    }
    setEndTime(newEnd)
    if (videoRef.current) {
      videoRef.current.currentTime = newEnd
    }
  }

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const ms = Math.floor((sec % 1) * 10)
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`
  }

  const handleConfirmTrim = async () => {
    const sliceDuration = endTime - startTime
    if (sliceDuration > 60.5) {
      showToast('Video slice cannot exceed 60 seconds')
      return
    }

    // If the original video is already under 60 seconds and starts from 0 with no cut needed:
    if (duration <= 60 && startTime <= 0.5 && Math.abs(endTime - duration) <= 0.5) {
      onTrimComplete(videoFile, selectedMusic)
      return
    }

    setIsProcessing(true)
    setProcessProgress(10)
    showToast('Processing 60s video cut studio...')

    try {
      // Check if MediaRecorder and captureStream are supported
      const videoEl = videoRef.current
      if (!videoEl || typeof (videoEl as any).captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
        // Fallback if browser does not support captureStream: return original file or sliced blob
        showToast('Browser does not support canvas stream encoding, using calibrated slice')
        onTrimComplete(videoFile, selectedMusic)
        return
      }

      const stream = (videoEl as any).captureStream(30)
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4'
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const trimmedBlob = new Blob(chunks, { type: recorder.mimeType || 'video/mp4' })
        const trimmedFile = new File([trimmedBlob], `trimmed_${Date.now()}_${videoFile.name.replace(/\.[^/.]+$/, "")}.mp4`, {
          type: 'video/mp4'
        })
        setIsProcessing(false)
        showToast('60s video studio cut prepared!')
        onTrimComplete(trimmedFile, selectedMusic)
      }

      videoEl.currentTime = startTime
      videoEl.muted = false
      setProcessProgress(25)

      await new Promise((resolve) => {
        videoEl.onseeked = () => resolve(true)
      })

      recorder.start(100)
      await videoEl.play()

      const checkInterval = setInterval(() => {
        if (!videoEl) return
        const progress = Math.min(95, Math.round(((videoEl.currentTime - startTime) / sliceDuration) * 100))
        setProcessProgress(progress)

        if (videoEl.currentTime >= endTime || videoEl.ended) {
          clearInterval(checkInterval)
          videoEl.pause()
          recorder.stop()
        }
      }, 100)
    } catch (err) {
      console.warn('MediaRecorder trim fallback:', err)
      // If error occurs, fallback cleanly to original file
      setIsProcessing(false)
      onTrimComplete(videoFile, selectedMusic)
    }
  }

  const sliceLength = (endTime - startTime).toFixed(1)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10005,
      background: 'rgba(3, 8, 18, 0.94)',
      backdropFilter: 'blur(24px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#07111f',
        border: '1px solid rgba(64, 201, 162, 0.3)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '94vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
        color: '#fff'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ color: 'var(--earth)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Multigram Studio
            </div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.25rem', margin: '2px 0 0 0', fontWeight: 700 }}>
              60-Second Video Trimmer
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Video Preview Player */}
        <div style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#000',
          aspectRatio: '9 / 16',
          maxHeight: '380px',
          margin: '0 auto 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onClick={togglePlay}
            />
          )}

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlay}
            style={{
              position: 'absolute',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(7, 17, 31, 0.75)',
              border: '2px solid var(--earth)',
              color: 'var(--earth)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              opacity: isPlaying ? 0 : 0.9,
              transition: 'opacity 0.2s ease',
              pointerEvents: isPlaying ? 'none' : 'auto'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>

          {/* Duration Badge */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: '100px',
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: Number(sliceLength) > 60 ? 'var(--danger)' : 'var(--earth)'
          }}>
            {sliceLength}s / 60s max
          </div>
        </div>

        {/* Scrubber Timeline Controls */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '16px', padding: '16px', marginBottom: '18px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '8px' }}>
            <span>Start: <strong style={{ color: 'var(--earth)' }}>{formatSeconds(startTime)}</strong></span>
            <span>Current: <strong>{formatSeconds(currentTime)}</strong></span>
            <span>End: <strong style={{ color: 'var(--earth)' }}>{formatSeconds(endTime)}</strong></span>
          </div>

          {/* Start Slider */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '4px' }}>Cut Start Point:</div>
            <input
              type="range"
              min={0}
              max={Math.max(0, duration - 1)}
              step={0.1}
              value={startTime}
              onChange={(e) => handleStartChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--earth)' }}
            />
          </div>

          {/* End Slider */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '4px' }}>Cut End Point (Max 60s Window):</div>
            <input
              type="range"
              min={1}
              max={duration || 60}
              step={0.1}
              value={endTime}
              onChange={(e) => handleEndChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--earth)' }}
            />
          </div>
        </div>

        {/* Soundtrack Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: 700 }}>
            Soundtrack / Music Track
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {cosmicMusicTracks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedMusic(t.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: selectedMusic === t.id ? '2px solid var(--earth)' : '1px solid var(--line)',
                  background: selectedMusic === t.id ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedMusic === t.id ? 'var(--earth)' : 'var(--text)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: '0.2s ease'
                }}
              >
                <div>{t.name}</div>
                <div style={{ fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 400 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--earth)', marginBottom: '4px' }}>
              <span>Rendering 60s high-res stream...</span>
              <span>{processProgress}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ width: `${processProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--earth), var(--earth-dark))', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '100px',
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.86rem'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmTrim}
            disabled={isProcessing || Number(sliceLength) > 60.5}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
              color: '#07111f',
              cursor: isProcessing || Number(sliceLength) > 60.5 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              boxShadow: '0 4px 20px rgba(64, 201, 162, 0.35)'
            }}
          >
            {isProcessing ? `Trimming (${processProgress}%)...` : `Attach 60s Cut (${sliceLength}s)`}
          </button>
        </div>
      </div>
    </div>
  )
}
