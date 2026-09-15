'use client'

import { useState } from 'react'
import { createPost } from '../app/actions'
import { UploadButton } from './UploadButton'
import { showToast } from './Toast'

export default function CreatePostBox({ currentUser }: { currentUser?: any }) {
  const [content, setContent] = useState('')
  const [mediaType, setMediaType] = useState('aurora')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isReelFormat, setIsReelFormat] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const atmospheres = [
    { id: 'aurora', label: 'Aurora', emoji: '🌌' },
    { id: 'mars-landscape', label: 'Mars Dune', emoji: '🪐' },
    { id: 'ocean', label: 'Deep Ocean', emoji: '🌊' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && mediaUrls.length === 0) return

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('content', content)
    
    // If multiple images: 'carousel', if format is reel: 'reel', else atmospheric sector
    const effectiveMediaType = mediaUrls.length > 1 
      ? 'carousel' 
      : isReelFormat 
      ? 'reel' 
      : mediaType
    formData.append('mediaType', effectiveMediaType)
    
    if (mediaUrls.length > 0) {
      formData.append('mediaUrl', mediaUrls.join(','))
    }

    try {
      const res = await createPost(formData)
      if (res.error) {
        showToast(`Signal failed: ${res.error}`)
      } else {
        showToast(mediaUrls.length > 1 ? 'Cosmic carousel transmitted!' : 'Signal transmitted into orbit!')
        setContent('')
        setMediaUrls([])
        setIsReelFormat(false)
        setIsOpen(false)
      }
    } catch (err) {
      showToast('Transmission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: '24px',
      padding: '20px',
      marginBottom: '26px',
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow)',
      transition: 'border-color 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className={`user-avatar ${currentUser?.color || 'green'}`} style={{ width: '42px', height: '42px', fontSize: '1rem', flexShrink: 0 }}>
          {currentUser?.avatarUrl || currentUser?.username?.charAt(0).toUpperCase() || '✦'}
        </div>
        <input 
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Transmit a cosmic signal or broadcast a reel..."
          style={{
            flex: 1,
            padding: '12px 18px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
        />
        {!isOpen && (
          <button 
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
              color: '#07111f',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Broadcast
          </button>
        )}
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          {/* Format selection */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setIsReelFormat(false)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: !isReelFormat ? 'var(--earth)' : 'var(--line)',
                background: !isReelFormat ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: !isReelFormat ? 'var(--earth)' : 'var(--muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🌌 Atmospheric Feed / Carousel
            </button>
            <button
              type="button"
              onClick={() => setIsReelFormat(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: isReelFormat ? 'var(--earth)' : 'var(--line)',
                background: isReelFormat ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: isReelFormat ? 'var(--earth)' : 'var(--muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ▶ Broadcast to Reels
            </button>
          </div>

          {/* Atmospheric Shader picker if not reel and no images */}
          {mediaUrls.length === 0 && !isReelFormat && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>
                Atmospheric Background Shader
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {atmospheres.map((atm) => (
                  <button
                    type="button"
                    key={atm.id}
                    onClick={() => setMediaType(atm.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '100px',
                      border: '1px solid',
                      borderColor: mediaType === atm.id ? 'var(--earth)' : 'var(--line)',
                      background: mediaType === atm.id ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: mediaType === atm.id ? 'var(--earth)' : 'var(--text)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: '0.15s ease'
                    }}
                  >
                    <span>{atm.emoji}</span>
                    <span>{atm.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Media Thumbnails (supports Carousel) */}
          {mediaUrls.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '8px' }}>
                {mediaUrls.length > 1 ? `Carousel Transmissions (${mediaUrls.length} frames)` : 'Attached Media'}
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {mediaUrls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line)' }}>
                    <img src={url} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                    {mediaUrls.length > 1 && (
                      <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px' }}>
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div title="Attach Photo or Reel Media (multi-upload supported for Carousel)">
                <UploadButton
                  endpoint="mediaUploader"
                  onClientUploadComplete={(res: any) => {
                    if (res && res.length > 0) {
                      const newUrls = res.map((r: any) => r.url)
                      setMediaUrls(prev => [...prev, ...newUrls])
                      showToast(newUrls.length > 1 ? 'Carousel frames attached!' : 'Media frame attached!')
                    }
                  }}
                  onUploadError={(err: Error) => showToast(`Upload error: ${err.message}`)}
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                {mediaUrls.length === 0 ? 'Attach image / reel' : '+ Add carousel slide'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setMediaUrls([])
                }}
                className="btn-outline"
                style={{ padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!content.trim() && mediaUrls.length === 0)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '100px',
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  color: '#07111f',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || (!content.trim() && mediaUrls.length === 0) ? 0.5 : 1
                }}
              >
                {isSubmitting ? 'Broadcasting...' : isReelFormat ? 'Broadcast to Reels ▶' : 'Broadcast Signal'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
