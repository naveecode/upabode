'use client'

import { useState, useRef, useEffect } from 'react'
import { createPost } from '../app/actions'
import { useUploadThing } from './UploadButton'
import { showToast } from './Toast'
import CameraCapture from './CameraCapture'
import CreateRichPostModal from './CreateRichPostModal'
import VideoTrimmerModal from './VideoTrimmerModal'
import { compressImage, validateMediaType } from '../lib/mediaCompressor'
import { useMentionAutocomplete, MentionDropdown } from './MentionSuggestions'

export default function CreatePostBox({ currentUser }: { currentUser?: any }) {
  const [content, setContent] = useState('')
  const [mediaType, setMediaType] = useState('aurora')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [publishFormat, setPublishFormat] = useState<'feed' | 'reel' | 'story'>('feed')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [showRichTextModal, setShowRichTextModal] = useState(false)
  const [pendingTrimmingVideo, setPendingTrimmingVideo] = useState<File | null>(null)
  const [musicTrack, setMusicTrack] = useState('')
  const [visualFilter, setVisualFilter] = useState('')
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [isUploadingCustomMusic, setIsUploadingCustomMusic] = useState(false)
  const { startUpload, isUploading } = useUploadThing("mediaUploader")

  const captionInputRef = useRef<HTMLInputElement>(null)
  const mention = useMentionAutocomplete({
    text: content,
    setText: setContent,
    inputRef: captionInputRef
  })

  // Hardware/gesture back-button support for closing camera
  useEffect(() => {
    if (showCamera) {
      window.history.pushState({ modal: 'camera' }, '')
      const prevHandler = (window as any).__multigramCloseModal
      ;(window as any).__multigramCloseModal = () => {
        setShowCamera(false)
        return true
      }
      const handlePopState = () => {
        setShowCamera(false)
      }
      window.addEventListener('popstate', handlePopState)
      return () => {
        ;(window as any).__multigramCloseModal = prevHandler
        window.removeEventListener('popstate', handlePopState)
      }
    }
  }, [showCamera])

  const handleGalleryPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return

    // Strict 60s limit check on video uploads
    const videoFile = files.find(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|ogg|mov)$/i))
    if (videoFile) {
      const dur = await new Promise<number>((resolve) => {
        try {
          const v = document.createElement('video')
          v.preload = 'metadata'
          v.onloadedmetadata = () => {
            window.URL.revokeObjectURL(v.src)
            resolve(v.duration || 0)
          }
          v.onerror = () => resolve(0)
          v.src = URL.createObjectURL(videoFile)
        } catch {
          resolve(0)
        }
      })

      if (dur > 60) {
        showToast('Video exceeds 60-second limit. Opening Trimmer Studio...')
        setPendingTrimmingVideo(videoFile)
        e.target.value = ''
        return
      }
    }

    setIsUploadingGallery(true)
    showToast('Optimizing & uploading media...')
    try {
      const res = await startUpload(files)
      if (res && res.length > 0) {
        const newUrls = res.map((r: any) => {
          const isVideo = r.name?.match(/\.(mp4|webm|ogg|mov)$/i) || r.type?.includes('video')
          return isVideo ? `${r.url}#video` : r.url
        })
        setMediaUrls(prev => [...prev, ...newUrls])
        setIsOpen(true)
        showToast(newUrls.length > 1 ? 'Carousel frames attached!' : 'Media attached! Choose format.')
      }
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`)
    } finally {
      setIsUploadingGallery(false)
      e.target.value = ''
    }
  }

  const handleCustomMusicPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return
    setIsUploadingCustomMusic(true)
    showToast('Uploading custom soundtrack...')
    try {
      const res = await startUpload(files)
      if (res && res[0]) {
        setMusicTrack(res[0].url)
        showToast('Custom audio soundtrack attached!')
      }
    } catch (err: any) {
      showToast(`Audio upload failed: ${err.message}`)
    } finally {
      setIsUploadingCustomMusic(false)
      e.target.value = ''
    }
  }

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

  const handleCapture = async (file: File) => {
    setShowCamera(false);
    showToast("Optimizing capture...");
    try {
      const optimized = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.88 });
      showToast("Uploading capture...");
      const res = await startUpload([optimized]);
      if (res && res.length > 0) {
        setMediaUrls(prev => [...prev, res[0].url]);
        setIsOpen(true);
        showToast("Capture attached!");
      }
    } catch (e: any) {
      showToast(`Upload failed: ${e.message}`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingGallery(true);
    showToast(`Optimizing ${files.length} ${files.length === 1 ? 'file' : 'files'}...`);
    try {
      const validFiles: File[] = [];
      for (const f of files) {
        const validation = validateMediaType(f);
        if (!validation.valid) {
          showToast(validation.error || 'Skipping unsupported file.');
          continue;
        }
        if (validation.type === 'image') {
          const compressed = await compressImage(f, { maxWidth: 1920, maxHeight: 1920, quality: 0.88 });
          validFiles.push(compressed);
        } else {
          validFiles.push(f);
        }
      }

      if (validFiles.length === 0) return;
      showToast("Uploading media...");
      const res = await startUpload(validFiles);
      if (res && res.length > 0) {
        const newUrls = res.map((r: any) => {
          const isVideo = r.name?.match(/\.(mp4|webm|ogg|mov)$/i) || r.type?.includes('video');
          return isVideo ? `${r.url}#video` : r.url;
        });
        setMediaUrls(prev => [...prev, ...newUrls]);
        setIsOpen(true);
        showToast(newUrls.length > 1 ? 'Carousel frames attached!' : 'Media attached!');
      }
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`);
    } finally {
      setIsUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div style={{
      background: isOpen ? 'var(--panel)' : 'transparent',
      border: isOpen ? '1px solid var(--line)' : 'none',
      borderRadius: '24px',
      padding: isOpen ? '24px' : '0px',
      marginBottom: isOpen ? '30px' : '16px',
      backdropFilter: isOpen ? 'blur(16px)' : 'none',
      boxShadow: isOpen ? 'var(--shadow)' : 'none',
      transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      textAlign: 'center'
    }}>
      {/* Immediate Full-Screen Upload Overlay */}
      {(isUploadingGallery || isUploadingCustomMusic || isUploading) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 17, 31, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            position: 'relative',
            width: '76px',
            height: '76px',
            display: 'grid',
            placeItems: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3.5px solid rgba(64, 201, 162, 0.2)',
              borderTopColor: 'var(--earth)',
              animation: 'spin 0.8s linear infinite'
            }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {isUploadingCustomMusic ? 'Uploading Audio Soundtrack...' : 'Transmitting Media to Orbit...'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
              Please wait while your media is optimized and encrypted.
            </p>
          </div>
        </div>
      )}

      {showCamera ? (
        <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      ) : !isOpen && mediaUrls.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '8px 12px',
          background: 'linear-gradient(135deg, rgba(14, 25, 44, 0.85) 0%, rgba(7, 17, 31, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxSizing: 'border-box'
        }}>
          {/* Glowing Aperture Camera Action Button */}
          <button
            type="button"
            title="Open Camera"
            onClick={() => setShowCamera(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #1e3a5f 0%, #0d1e34 70%, #061120 100%)',
              border: '2px solid rgba(64, 201, 162, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(64, 201, 162, 0.4), inset 0 0 10px rgba(64, 201, 162, 0.25)',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
              transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(64, 201, 162, 0.6), inset 0 0 14px rgba(64, 201, 162, 0.4)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(64, 201, 162, 0.4), inset 0 0 10px rgba(64, 201, 162, 0.25)'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#40c9a2' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          {/* Quick Caption / Signal Trigger Capsule */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              flex: 1,
              height: '42px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '100px',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--muted)',
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s ease, border-color 0.2s ease',
              minWidth: 0
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)'
              e.currentTarget.style.borderColor = 'rgba(64, 201, 162, 0.35)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--earth)', flexShrink: 0 }}>
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255, 255, 255, 0.7)' }}>
              Broadcast signal across orbit...
            </span>
          </button>

          {/* Gallery Upload Trigger */}
          <label
            title="Attach Gallery Media"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '100px',
              background: isUploadingGallery
                ? 'rgba(64, 201, 162, 0.25)'
                : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: isUploadingGallery ? 'var(--earth)' : 'var(--text)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isUploadingGallery ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none',
              flexShrink: 0
            }}
            onMouseOver={e => {
              if (!isUploadingGallery) {
                e.currentTarget.style.borderColor = 'var(--earth)'
                e.currentTarget.style.background = 'rgba(64, 201, 162, 0.12)'
              }
            }}
            onMouseOut={e => {
              if (!isUploadingGallery) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
              }
            }}
          >
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={isUploadingGallery}
              style={{ display: 'none' }}
              onChange={handleGalleryPick}
            />
            {isUploadingGallery ? (
              <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
            <span>Gallery</span>
          </label>

          {/* Rich Text Signal Modal Trigger */}
          <button
            type="button"
            title="Compose Rich Text Signal"
            onClick={() => setShowRichTextModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '100px',
              background: 'rgba(64, 201, 162, 0.12)',
              border: '1px solid rgba(64, 201, 162, 0.4)',
              color: 'var(--earth)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(64, 201, 162, 0.22)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(64, 201, 162, 0.12)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span>Write</span>
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div className={`user-avatar ${currentUser?.color || 'green'}`} style={{ width: '42px', height: '42px', fontSize: '1rem', flexShrink: 0 }}>
              {currentUser?.avatarUrl?.startsWith?.('http') ? <img src={currentUser?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (currentUser?.avatarUrl || currentUser?.username?.charAt(0).toUpperCase() || '✦')}
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                ref={captionInputRef}
                autoFocus
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 100))}
                onKeyDown={mention.handleKeyDown}
                placeholder="Add a caption to your transmission... (type @ to mention)"
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  paddingRight: '50px',
                  borderRadius: '100px',
                  background: 'rgba(0, 0, 0, 0.04)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                }}
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: content.length >= 100 ? 'var(--danger)' : 'var(--muted)' }}>
                {content.length}/100
              </span>

              {mention.isOpen && (
                <MentionDropdown
                  users={mention.users}
                  selectedIndex={mention.selectedIndex}
                  onSelect={mention.selectUser}
                  isLoading={mention.isLoading}
                />
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            {/* Format selection */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setPublishFormat('feed')}
                style={{
                  padding: '8px 18px', borderRadius: '100px', border: '1px solid',
                  borderColor: publishFormat === 'feed' ? 'var(--earth)' : 'var(--line)',
                  background: publishFormat === 'feed' ? 'rgba(197, 160, 89, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                  color: publishFormat === 'feed' ? 'var(--earth)' : 'var(--muted)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: '0.2s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                Post to Feed
              </button>
              <button
                type="button"
                onClick={() => setPublishFormat('reel')}
                style={{
                  padding: '8px 18px', borderRadius: '100px', border: '1px solid',
                  borderColor: publishFormat === 'reel' ? 'var(--earth)' : 'var(--line)',
                  background: publishFormat === 'reel' ? 'rgba(197, 160, 89, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                  color: publishFormat === 'reel' ? 'var(--earth)' : 'var(--muted)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: '0.2s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Reel
              </button>
              <button
                type="button"
                onClick={() => setPublishFormat('story')}
                style={{
                  padding: '8px 18px', borderRadius: '100px', border: '1px solid',
                  borderColor: publishFormat === 'story' ? 'var(--earth)' : 'var(--line)',
                  background: publishFormat === 'story' ? 'rgba(197, 160, 89, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                  color: publishFormat === 'story' ? 'var(--earth)' : 'var(--muted)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: '0.2s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                24h Status
              </button>
            </div>

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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                Media Studio
              </div>

              {/* Uploaded Media Thumbnails (supports Carousel) */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line)' }}>
                      <div className={visualFilter || ''} style={{ width: '100%', height: '100%' }}>
                        {url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('#video') ? (
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
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
                    Custom Audio Track
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <select
                        value={musicTrack}
                        onChange={(e) => setMusicTrack(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'var(--panel)',
                          border: '1px solid var(--line)',
                          color: 'var(--text)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="">Original Audio / None</option>
                        {/* Built-in Large Library */}
                        <option value="/audio/cosmic-drift.mp3">Cosmic Drift (Ambient)</option>
                        <option value="/audio/lunar-lounge.mp3">Lunar Lounge (Lo-Fi)</option>
                        <option value="/audio/nebula-beats.mp3">Nebula Beats (Synthwave)</option>
                        <option value="/audio/pulsar-synth.mp3">Pulsar Synth (Electronic)</option>
                        <option value="/audio/stellar-groove.mp3">Stellar Groove (Pop)</option>
                        <option value="/audio/zero-gravity.mp3">Zero Gravity (Trap)</option>
                        <option value="/audio/martian-sunset.mp3">Martian Sunset (Acoustic)</option>
                        <option value="/audio/event-horizon.mp3">Event Horizon (Cinematic)</option>
                        <option value="/audio/solar-flare.mp3">Solar Flare (Rock)</option>
                        <option value="/audio/galactic-jazz.mp3">Galactic Jazz (Jazz)</option>
                        {/* If custom track is uploaded, show it as selected */}
                        {musicTrack.includes('utfs.io') && (
                          <option value={musicTrack}>Custom Uploaded Track</option>
                        )}
                      </select>
                      
                      {/* Custom Music Upload */}
                      <label 
                        title="Upload custom audio track"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '0 14px',
                          height: '42px',
                          borderRadius: '8px',
                          background: isUploadingCustomMusic ? 'rgba(64, 201, 162, 0.3)' : 'rgba(64, 201, 162, 0.15)',
                          border: '1px solid var(--earth)',
                          color: 'var(--earth)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: isUploadingCustomMusic ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="file"
                          accept="audio/*"
                          style={{ display: 'none' }}
                          disabled={isUploadingCustomMusic}
                          onChange={handleCustomMusicPick}
                        />
                        {isUploadingCustomMusic ? (
                          <>
                            <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" /></svg>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>🎵 Upload</>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label title="Attach Photo or Reel Media (multi-upload supported for Carousel)" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '100px',
                background: 'rgba(197, 160, 89, 0.15)',
                border: '1px solid var(--earth)',
                color: 'var(--earth)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isUploading ? 'wait' : 'pointer',
                opacity: isUploading ? 0.7 : 1,
                transition: '0.2s ease'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  {isUploading ? 'Optimizing & Uploading...' : 'Attach Media'}
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={isUploading}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                {mediaUrls.length === 0 ? 'Photos or Reels' : `+ ${mediaUrls.length} attached`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowRichTextModal(true)}
                style={{
                  background: 'none',
                  border: '1px dashed var(--earth)',
                  color: 'var(--earth)',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Rich Text
              </button>
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
                {isSubmitting ? 'Broadcasting...' : publishFormat === 'reel' ? 'Broadcast Reel' : publishFormat === 'story' ? 'Post Status' : 'Broadcast Signal'}
              </button>
            </div>
          </div>
        </form>
        </div>
      )}
      {showRichTextModal && <CreateRichPostModal onClose={() => setShowRichTextModal(false)} />}
      {pendingTrimmingVideo && (
        <VideoTrimmerModal
          videoFile={pendingTrimmingVideo}
          onCancel={() => setPendingTrimmingVideo(null)}
          onTrimComplete={async (trimmedFile, selectedMusic) => {
            setPendingTrimmingVideo(null)
            setIsUploadingGallery(true)
            showToast('Uploading 60s trimmed video...')
            try {
              const res = await startUpload([trimmedFile])
              if (res && res[0]) {
                setMediaUrls(prev => [...prev, `${res[0].url}#video`])
                setPublishFormat('reel')
                if (selectedMusic) {
                  setMusicTrack(selectedMusic)
                }
                setIsOpen(true)
                showToast('60s video attached successfully!')
              }
            } catch (err: any) {
              showToast(`Upload failed: ${err.message}`)
            } finally {
              setIsUploadingGallery(false)
            }
          }}
        />
      )}
    </div>
  )
}

