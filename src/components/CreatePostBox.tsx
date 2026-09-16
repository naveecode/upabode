'use client'

import { useState } from 'react'
import { createPost } from '../app/actions'
import { UploadButton } from './UploadButton'
import { showToast } from './Toast'

export default function CreatePostBox({ currentUser }: { currentUser?: any }) {
  const [content, setContent] = useState('')
  const [mediaType, setMediaType] = useState('aurora')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [publishFormat, setPublishFormat] = useState<'feed' | 'reel' | 'story'>('feed')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [musicTrack, setMusicTrack] = useState('')
  const [visualFilter, setVisualFilter] = useState('')

  const atmospheres = [
    { id: 'aurora', label: 'Aurora', emoji: '🌌' },
    { id: 'mars-landscape', label: 'Mars Dune', emoji: '🪐' },
    { id: 'ocean', label: 'Deep Ocean', emoji: '🌊' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && mediaUrls.length === 0) return

    setIsSubmitting(true)

    try {
      if (publishFormat === 'story') {
        const { createStory } = await import('../app/actions')
        const firstMedia = mediaUrls[0] || null
        const res = await createStory(firstMedia!, content)
        if (res.error) showToast(`Story failed: ${res.error}`)
        else showToast('Status broadcasted for 24h!')
      } else {
        const formData = new FormData()
        formData.append('content', content)
        
        const effectiveMediaType = mediaUrls.length > 1 
          ? 'carousel' 
          : publishFormat === 'reel' 
          ? 'reel' 
          : mediaType
        formData.append('mediaType', effectiveMediaType)
        
        if (mediaUrls.length > 0) {
          formData.append('mediaUrl', mediaUrls.join(','))
        }
        if (musicTrack) formData.append('musicTrack', musicTrack)
        if (visualFilter) formData.append('visualFilter', visualFilter)

        const res = await createPost(formData)
        if (res.error) showToast(`Signal failed: ${res.error}`)
        else showToast(mediaUrls.length > 1 ? 'Cosmic carousel transmitted!' : 'Signal transmitted into orbit!')
      }

      setContent('')
      setMediaUrls([])
      setPublishFormat('feed')
      setMusicTrack('')
      setVisualFilter('')
      setIsOpen(false)
      window.location.reload()
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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPublishFormat('feed')}
              style={{
                padding: '6px 14px', borderRadius: '100px', border: '1px solid',
                borderColor: publishFormat === 'feed' ? 'var(--earth)' : 'var(--line)',
                background: publishFormat === 'feed' ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: publishFormat === 'feed' ? 'var(--earth)' : 'var(--muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              🌌 Feed
            </button>
            <button
              type="button"
              onClick={() => setPublishFormat('reel')}
              style={{
                padding: '6px 14px', borderRadius: '100px', border: '1px solid',
                borderColor: publishFormat === 'reel' ? 'var(--earth)' : 'var(--line)',
                background: publishFormat === 'reel' ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: publishFormat === 'reel' ? 'var(--earth)' : 'var(--muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              ▶ Reels
            </button>
            <button
              type="button"
              onClick={() => setPublishFormat('story')}
              style={{
                padding: '6px 14px', borderRadius: '100px', border: '1px solid',
                borderColor: publishFormat === 'story' ? '#ffb347' : 'var(--line)',
                background: publishFormat === 'story' ? 'rgba(255, 179, 71, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: publishFormat === 'story' ? '#ffb347' : 'var(--muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              ⏱ Status (24h)
            </button>
          </div>

          {/* Atmospheric Shader picker if feed and no images */}
          {mediaUrls.length === 0 && publishFormat === 'feed' && (
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

          {/* Media Studio (Music & Filters) */}
          {mediaUrls.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '16px',
              border: '1px solid var(--line)'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--earth)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✨</span> Media Studio
              </div>

              {/* Uploaded Media Thumbnails (supports Carousel) */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line)' }}>
                      <div className={visualFilter || ''} style={{ width: '100%', height: '100%' }}>
                        {url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                          <video src={url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={url} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: '50%', width: '22px', height: '22px', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Visual Filters */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Visual Filter
                  </label>
                  <select
                    value={visualFilter}
                    onChange={(e) => setVisualFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--panel)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">No Filter (Original)</option>
                    <option value="filter-grayscale">Grayscale / Noir</option>
                    <option value="filter-sepia">Sepia / Vintage</option>
                    <option value="filter-cyberpunk">Cyberpunk (Neon Hue)</option>
                    <option value="filter-contrast">High Contrast</option>
                  </select>
                </div>

                {/* Music Tracks */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Audio Track
                  </label>
                  <select
                    value={musicTrack}
                    onChange={(e) => setMusicTrack(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--panel)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">Original Audio / None</option>
                    <option value="/audio/cosmic-drift.mp3">Cosmic Drift (Ambient)</option>
                    <option value="/audio/lunar-lounge.mp3">Lunar Lounge (Lo-Fi)</option>
                    <option value="/audio/nebula-beats.mp3">Nebula Beats (Synthwave)</option>
                    <option value="/audio/pulsar-synth.mp3">Pulsar Synth (Electronic)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div title="Attach Photo or Reel Media (multi-upload supported for Carousel)">
                <UploadButton
                  endpoint="mediaUploader"
                  onClientUploadComplete={(res: any) => {
                    if (res && res.length > 0) {
                      const newUrls = res.map((r: any) => {
                        const isVideo = r.name?.match(/\.(mp4|webm|ogg|mov)$/i) || r.type?.includes('video');
                        return isVideo ? `${r.url}#video` : r.url;
                      });
                      setMediaUrls(prev => [...prev, ...newUrls]);
                      showToast(newUrls.length > 1 ? 'Carousel frames attached!' : 'Media frame attached!');
                    }
                  }}
                  onUploadError={(err: Error) => showToast(`Upload error: ${err.message}`)}
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                {mediaUrls.length === 0 ? 'Attach media' : '+ Add more frames'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setMediaUrls([])
                  setMusicTrack('')
                  setVisualFilter('')
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
                  opacity: isSubmitting || (!content.trim() && mediaUrls.length === 0) ? 0.5 : 1,
                  border: 'none'
                }}
              >
                {isSubmitting ? 'Broadcasting...' : publishFormat === 'reel' ? 'Broadcast Reel ▶' : publishFormat === 'story' ? 'Post Status' : 'Broadcast Signal'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
