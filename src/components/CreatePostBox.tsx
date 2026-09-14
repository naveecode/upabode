'use client'

import { useState } from 'react'
import { createPost } from '../app/actions'
import { UploadButton } from './UploadButton'
import { showToast } from './Toast'

export default function CreatePostBox({ currentUser }: { currentUser?: any }) {
  const [content, setContent] = useState('')
  const [mediaType, setMediaType] = useState('aurora')
  const [mediaUrl, setMediaUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const atmospheres = [
    { id: 'aurora', label: 'Aurora', emoji: '🌌' },
    { id: 'mars-landscape', label: 'Mars Dune', emoji: '🪐' },
    { id: 'ocean', label: 'Deep Ocean', emoji: '🌊' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !mediaUrl) return

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('content', content)
    formData.append('mediaType', mediaType)
    if (mediaUrl) formData.append('mediaUrl', mediaUrl)

    try {
      const res = await createPost(formData)
      if (res.error) {
        showToast(`Signal failed: ${res.error}`)
      } else {
        showToast('Signal transmitted into orbit!')
        setContent('')
        setMediaUrl('')
        setIsOpen(false)
      }
    } catch (err) {
      showToast('Transmission failed')
    } finally {
      setIsSubmitting(false)
    }
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
          placeholder="Transmit a cosmic signal to the network..."
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
            Transmit
          </button>
        )}
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>
              Atmospheric Atmosphere Sector
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

          {mediaUrl && (
            <div style={{ position: 'relative', marginBottom: '14px', borderRadius: '14px', overflow: 'hidden', maxHeight: '200px' }}>
              <img src={mediaUrl} alt="Attached" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setMediaUrl('')}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div title="Attach custom media">
                <UploadButton
                  endpoint="mediaUploader"
                  onClientUploadComplete={(res: any) => {
                    if (res && res[0]) {
                      setMediaUrl(res[0].url)
                      showToast('Media ready for transmission!')
                    }
                  }}
                  onUploadError={(err: Error) => showToast(`Upload error: ${err.message}`)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-outline"
                style={{ padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!content.trim() && !mediaUrl)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '100px',
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  color: '#07111f',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || (!content.trim() && !mediaUrl) ? 0.5 : 1
                }}
              >
                {isSubmitting ? 'Broadcasting...' : 'Broadcast'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
