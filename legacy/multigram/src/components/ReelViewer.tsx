'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toggleFollow, savePost, addReelComment, getShareContacts } from '../app/actions'
import { showToast } from './Toast'
import { releaseVideoMemory } from '../lib/mediaMemoryManager'
import { haptic, playLikePop, playSaveClick, playToggleTick } from '../lib/soundAndHaptics'
import { renderWithMentions } from './Post'
import { useMentionAutocomplete, MentionDropdown } from './MentionSuggestions'
import { getCachedMediaUrl, getCachedThumbnail, preloadReelsAndThumbnails } from '../lib/mediaCache'

function VideoPlayer({ src, musicTrack, posterUrl }: { src: string; musicTrack?: string; posterUrl?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);
  const volumeRef = useRef(1);
  const [showIndicator, setShowIndicator] = useState<'volume' | 'brightness' | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [cachedPoster, setCachedPoster] = useState<string | null>(posterUrl || null);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Resolve cached blob URL and thumbnail from device storage
  useEffect(() => {
    let isMounted = true;
    getCachedMediaUrl(src).then(cached => {
      if (isMounted && cached) setResolvedSrc(cached);
    });
    getCachedThumbnail(src).then(thumb => {
      if (isMounted && thumb) setCachedPoster(thumb);
    });
    return () => { isMounted = false; };
  }, [src]);
  
  // Touch drag state
  const touchState = useRef({ startY: 0, startVal: 0, type: '' });

  const playMedia = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      videoRef.current.muted = false;
      videoRef.current.volume = volumeRef.current;
      await videoRef.current.play();
      setIsPlaying(true);
      setHasStartedPlaying(true);
      setIsMuted(false);
      if (audioRef.current && musicTrack) {
        audioRef.current.volume = volumeRef.current;
        audioRef.current.play().catch(() => {});
      }
    } catch (err) {
      // Browser autoplay policy blocked unmuted sound. Play muted so video still plays smoothly:
      try {
        if (videoRef.current) {
          videoRef.current.muted = true;
          await videoRef.current.play();
          setIsPlaying(true);
          setIsMuted(true);
        }
      } catch (e) {
        setIsPlaying(false);
      }
    }
  }, [musicTrack]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playMedia();
          } else {
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    const videoEl = videoRef.current;
    if (videoEl) observer.observe(videoEl);
    return () => {
      observer.disconnect();
      if (videoEl) releaseVideoMemory(videoEl);
    };
  }, [src, playMedia]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.muted = false;
      videoRef.current.volume = volumeRef.current || 1;
      setIsMuted(false);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      if (audioRef.current && musicTrack) {
        audioRef.current.volume = volumeRef.current || 1;
        audioRef.current.play().catch(() => {});
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      videoRef.current.volume = 1;
      volumeRef.current = 1;
      setVolume(1);
      if (audioRef.current) {
        audioRef.current.muted = false;
        audioRef.current.volume = 1;
      }
      showToast('Audio Unmuted 🔊');
    } else {
      if (audioRef.current) audioRef.current.muted = true;
      showToast('Audio Muted 🔇');
    }
  };

  const handleLeftTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    touchState.current = {
      startY: touch.clientY,
      startVal: brightness,
      type: 'brightness'
    };
  };

  const handleLeftTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (touchState.current.type !== 'brightness') return;
    const touch = e.touches[0];
    const diff = (touchState.current.startY - touch.clientY) * 0.01;
    const newVal = Math.max(0.2, Math.min(2.0, touchState.current.startVal + diff));
    setBrightness(newVal);
    setShowIndicator('brightness');
  };

  const handleLeftTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchState.current = { startY: 0, startVal: 0, type: '' };
    setTimeout(() => setShowIndicator(null), 1200);
  };

  const handleRightTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    touchState.current = {
      startY: touch.clientY,
      startVal: volumeRef.current,
      type: 'volume'
    };
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (touchState.current.type !== 'volume') return;
    const touch = e.touches[0];
    const diff = (touchState.current.startY - touch.clientY) * 0.01;
    const newVal = Math.max(0, Math.min(1.0, touchState.current.startVal + diff));
    volumeRef.current = newVal;
    if (videoRef.current) {
      videoRef.current.volume = newVal;
      if (newVal > 0) {
        videoRef.current.muted = false;
        setIsMuted(false);
      } else {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
    if (audioRef.current) audioRef.current.volume = newVal;
    setVolume(newVal);
    setShowIndicator('volume');
  };

  const handleRightTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchState.current = { startY: 0, startVal: 0, type: '' };
    setTimeout(() => setShowIndicator(null), 1200);
  };

  return (
    <div 
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000', overflow: 'hidden' }} 
    >
      {/* Ambient backdrop to fill letterbox areas naturally without duplicate video decoders */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, rgba(35, 52, 77, 0.55) 0%, rgba(5, 10, 18, 0.98) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Main Video: 100% full media visible without crop (original aspect ratio) */}
      <video
        ref={videoRef}
        src={resolvedSrc.includes('#') ? resolvedSrc : `${resolvedSrc}#t=0.001`}
        loop
        playsInline
        preload="auto"
        onPlaying={() => {
          setHasStartedPlaying(true);
          setIsPlaying(true);
        }}
        onTimeUpdate={(e) => {
          if ((e.target as HTMLVideoElement).currentTime > 0.05 && !hasStartedPlaying) {
            setHasStartedPlaying(true);
          }
        }}
        onPlay={(e) => {
          setIsPlaying(true);
          const target = e.target as HTMLVideoElement;
          document.querySelectorAll('video, audio').forEach(media => {
            if (media !== target && media !== audioRef.current) (media as HTMLMediaElement).pause();
          });
        }}
        onPause={() => setIsPlaying(false)}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: `brightness(${brightness})`,
          zIndex: 5
        }}
      />

      {/* Zero-Flicker Poster Overlay: Shields screen and prevents default browser play watermark */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07111f',
          opacity: hasStartedPlaying ? 0 : 1,
          pointerEvents: 'none',
          transition: 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {cachedPoster ? (
          <img
            src={cachedPoster}
            alt="Reel Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid rgba(64, 201, 162, 0.2)',
              borderTopColor: 'var(--earth)',
              animation: 'spin 0.75s linear infinite'
            }} />
          </div>
        )}
      </div>

      {musicTrack && (
        <audio ref={audioRef} src={musicTrack} loop />
      )}

      {/* LEFT ZONE: Dedicated Brightness Control (touch-action: none prevents vertical scroll) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: '220px',
          left: 0,
          width: '75px',
          zIndex: 35,
          touchAction: 'none'
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={handleLeftTouchStart}
        onTouchMove={handleLeftTouchMove}
        onTouchEnd={handleLeftTouchEnd}
      />

      {/* RIGHT ZONE: Dedicated Volume Control (touch-action: none prevents vertical scroll) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: '220px',
          right: 0,
          width: '75px',
          zIndex: 35,
          touchAction: 'none'
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={handleRightTouchStart}
        onTouchMove={handleRightTouchMove}
        onTouchEnd={handleRightTouchEnd}
      />

      {/* CENTER ZONE: Broad scroll & tap area (touch-action: pan-y allows smooth reel scrolling) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '75px',
          right: '75px',
          zIndex: 25,
          touchAction: 'pan-y'
        }}
        onClick={togglePlay}
      />

      {/* Floating Audio Mute/Unmute Toggle */}
      <button
        type="button"
        onClick={toggleMute}
        style={{
          position: 'absolute',
          top: '24px',
          right: '20px',
          zIndex: 45,
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
      >
        {isMuted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        )}
      </button>

      {!isPlaying && (
        <div 
          onClick={togglePlay}
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
            backdropFilter: 'blur(4px)', zIndex: 30
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      )}
      
      {/* Sleek Vertical Indicator Bar Overlay */}
      {showIndicator && (
        <div style={{
          position: 'absolute',
          top: '32%',
          left: showIndicator === 'brightness' ? '24px' : 'auto',
          right: showIndicator === 'volume' ? '24px' : 'auto',
          transform: 'translateY(-50%)',
          background: 'rgba(7, 17, 31, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '12px 14px',
          borderRadius: '20px',
          color: 'white',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          zIndex: 50,
          boxShadow: '0 12px 35px rgba(0,0,0,0.6)'
        }}>
          <span style={{ fontSize: '18px' }}>{showIndicator === 'brightness' ? '☀️' : volume === 0 ? '🔇' : '🔊'}</span>
          <div style={{ width: '6px', height: '90px', background: 'rgba(255,255,255,0.18)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: showIndicator === 'brightness' ? `${Math.min(100, Math.round((brightness / 2) * 100))}%` : `${Math.round(volume * 100)}%`,
              background: 'var(--earth)',
              borderRadius: '4px',
              transition: 'height 0.05s linear'
            }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--earth)', fontWeight: 700 }}>
            {showIndicator === 'brightness' ? `${Math.round(brightness * 50)}%` : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

interface ReelComment {
  id: string
  content: string
  xPercent: number
  yPercent: number
  userId: string
  user: {
    id: string
    username: string
    handle: string
    avatarUrl?: string | null
    color?: string | null
  }
}

interface Post {
  id: string
  content: string
  mediaUrl?: string | null
  mediaType?: string | null
  channel?: string | null
  authorId: string
  author: {
    id: string
    username: string
    handle: string
    avatarUrl?: string | null
    color?: string | null
    followers?: any[]
  }
  likes: any[]
  reelComments?: ReelComment[]
  savedBy?: any[]
}

export default function ReelViewer({
  posts: initialPosts,
  currentUser,
  initialTargetId,
}: {
  posts: Post[]
  currentUser?: any
  initialTargetId?: string
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null)

  // Jump to specific reel if initialTargetId or URL params are present
  useEffect(() => {
    const targetId = initialTargetId || (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.search).get('post')) : null)
    if (targetId && posts.length > 0) {
      const idx = posts.findIndex(p => p.id === targetId)
      if (idx !== -1) {
        setActiveIdx(idx)
        setTimeout(() => {
          const el = document.getElementById(`reel-${targetId}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 150)
      }
    }
  }, [initialTargetId, posts])

  // Preload and cache first few reels & thumbnails in local device storage
  useEffect(() => {
    preloadReelsAndThumbnails(posts)
  }, [posts])
  
  // New pin placement state
  const [pendingPin, setPendingPin] = useState<{
    postId: string
    xPercent: number
    yPercent: number
  } | null>(null)
  const [pinCommentText, setPinCommentText] = useState('')
  const [isSubmittingPin, setIsSubmittingPin] = useState(false)

  // Share Modal State
  const [sharePostId, setSharePostId] = useState<string | null>(null)
  const [shareSearchQuery, setShareSearchQuery] = useState('')
  const [shareUsers, setShareUsers] = useState<any[]>([])
  const [recentContacts, setRecentContacts] = useState<any[]>([])
  const [isSearchingShare, setIsSearchingShare] = useState(false)

  // Fetch mutual / chatted contacts ONLY when share modal is opened
  useEffect(() => {
    if (sharePostId) {
      getShareContacts().then(res => {
        if (res?.success && res.users) {
          setRecentContacts(res.users)
          if (!shareSearchQuery) {
            setShareUsers(res.users)
          }
        }
      }).catch(() => {})
    } else {
      setShareSearchQuery('')
      setShareUsers([])
    }
  }, [sharePostId])

  const handleShareSearch = async (q: string) => {
    setShareSearchQuery(q)
    if (q.trim().length < 1) {
      setShareUsers(recentContacts)
      return
    }
    setIsSearchingShare(true)
    const { searchUsers } = await import('../app/actions')
    const res = await searchUsers(q)
    if (res.success && res.users) {
      setShareUsers(res.users)
    }
    setIsSearchingShare(false)
  }

  const handleCopyLink = () => {
    if (!sharePostId) return
    const url = `${window.location.origin}/reels?post=${sharePostId}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Reel link copied to clipboard! 📋')
      }).catch(() => {
        showToast('Link copied: ' + url)
      })
    } else {
      showToast('Link: ' + url)
    }
  }

  const [sendingShareUserIds, setSendingShareUserIds] = useState<Record<string, 'sending' | 'sent'>>({})
  const [activeCommentsDrawerPostId, setActiveCommentsDrawerPostId] = useState<string | null>(null)
  const [drawerCommentText, setDrawerCommentText] = useState('')
  const [isSubmittingDrawerComment, setIsSubmittingDrawerComment] = useState(false)
  const drawerCommentInputRef = useRef<HTMLInputElement>(null)
  const drawerMention = useMentionAutocomplete({
    text: drawerCommentText,
    setText: setDrawerCommentText,
    inputRef: drawerCommentInputRef
  })

  const [replyingToComment, setReplyingToComment] = useState<{ id: string; username: string; handle: string } | null>(null)

  // Automatic Audio Silence when Comments/Notes Drawer is open, hide bottom floating menu, and resume on close
  const previousMuteStates = useRef<Map<HTMLMediaElement, boolean>>(new Map())

  useEffect(() => {
    if (activeCommentsDrawerPostId) {
      document.body.setAttribute('data-drawer-open', 'true')
      document.querySelectorAll('video, audio').forEach((m) => {
        const el = m as HTMLMediaElement
        previousMuteStates.current.set(el, el.muted)
        el.muted = true
      })
    } else {
      document.body.removeAttribute('data-drawer-open')
      setReplyingToComment(null)
      if (previousMuteStates.current.size > 0) {
        previousMuteStates.current.forEach((prevMuted, el) => {
          el.muted = prevMuted
        })
        previousMuteStates.current.clear()
      }
    }
    return () => {
      document.body.removeAttribute('data-drawer-open')
    }
  }, [activeCommentsDrawerPostId])

  const handleShareToUser = async (userId: string) => {
    if (!sharePostId) return
    if (sendingShareUserIds[userId]) return
    setSendingShareUserIds(prev => ({ ...prev, [userId]: 'sending' }))

    const { startChat, shareReelToChat } = await import('../app/actions')
    try {
      const chatRes = await startChat(userId)
      if (chatRes.success && chatRes.chatId) {
        const shareRes = await shareReelToChat(sharePostId, chatRes.chatId)
        if (shareRes.success) {
          setSendingShareUserIds(prev => ({ ...prev, [userId]: 'sent' }))
          haptic(15)
          playToggleTick()
          showToast('Reel transmitted to channel successfully!')
          setTimeout(() => {
            setSharePostId(null)
            setSendingShareUserIds({})
          }, 650)
        } else {
          setSendingShareUserIds(prev => {
            const copy = { ...prev }
            delete copy[userId]
            return copy
          })
          showToast('Failed to transmit reel.')
        }
      } else {
        setSendingShareUserIds(prev => {
          const copy = { ...prev }
          delete copy[userId]
          return copy
        })
        showToast('Failed to open channel.')
      }
    } catch {
      setSendingShareUserIds(prev => {
        const copy = { ...prev }
        delete copy[userId]
        return copy
      })
      showToast('Failed to open channel.')
    }
  }

  const handleDrawerAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCommentsDrawerPostId || !drawerCommentText.trim() || isSubmittingDrawerComment) return

    const text = drawerCommentText.trim()
    setIsSubmittingDrawerComment(true)
    const postId = activeCommentsDrawerPostId

    const tempId = `drawer-temp-${Date.now()}`
    const tempComment: ReelComment = {
      id: tempId,
      content: text,
      xPercent: 50,
      yPercent: 50,
      userId: currentUser?.id || 'anon',
      user: {
        id: currentUser?.id || 'anon',
        username: currentUser?.username || 'You',
        handle: currentUser?.handle || 'me',
        avatarUrl: currentUser?.avatarUrl,
        color: currentUser?.color || 'green',
      }
    }

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          reelComments: [...(post.reelComments || []), tempComment]
        }
      }
      return post
    }))

    setDrawerCommentText('')
    setReplyingToComment(null)
    setIsSubmittingDrawerComment(false)
    haptic(10)
    playToggleTick()
    showToast('Transmission note published!')

    try {
      const res = await addReelComment(postId, text, 50, 50)
      if (res?.comment) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              reelComments: (post.reelComments || []).map(c => c.id === tempId ? res.comment : c)
            }
          }
          return post
        }))
      }
    } catch (err) {
      console.error('Failed to add drawer comment:', err)
    }
  }

  // Gesture Feedback Animation
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: 'follow' | 'save' | 'comments'
    label: string
    icon: string
  } | null>(null)

  // Following & Saved status cache
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    initialPosts.forEach(p => {
      map[p.id] = currentUser && p.savedBy ? p.savedBy.some((s: any) => s.userId === currentUser.id) : false
    })
    return map
  })

  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    initialPosts.forEach(p => {
      map[p.authorId] = currentUser && p.author?.followers ? p.author.followers.some((f: any) => f.followerId === currentUser.id) : false
    })
    return map
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const currentCardRef = useRef<HTMLDivElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const [isAddingComment, setIsAddingComment] = useState(false)

  const triggerFeedback = (type: 'follow' | 'save' | 'comments', label: string, icon: string) => {
    setGestureFeedback({ type, label, icon })
    setTimeout(() => {
      setGestureFeedback(null)
    }, 1100)
  }

  const [saveModalPostId, setSaveModalPostId] = useState<string | null>(null);

  // Handle Swipe Left -> Save
  const handleSwipeLeft = async (postId: string) => {
    const isCurrentlySaved = !!savedMap[postId];
    if (isCurrentlySaved) {
      setSavedMap(prev => ({ ...prev, [postId]: false }));
      haptic(8);
      playToggleTick();
      triggerFeedback('save', 'Removed from Saved', '❌');
      showToast('Removed from Saved Archive');
      await savePost(postId, false);
    } else {
      setSaveModalPostId(postId);
    }
  }

  const confirmSave = async (postId: string, isPublic: boolean) => {
    setSaveModalPostId(null);
    setSavedMap(prev => ({ ...prev, [postId]: true }));
    haptic(10);
    playSaveClick();
    triggerFeedback('save', isPublic ? 'Saved (Public)' : 'Saved (Private)', '🔗');
    showToast(isPublic ? 'Saved publicly' : 'Saved privately');
    await savePost(postId, isPublic);
  }

  const handleDelete = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast('Transmission deleted');
    const { deletePost } = await import('../app/actions');
    await deletePost(postId);
  }

  // Handle Swipe Right -> Follow
  const handleSwipeRight = async (authorId: string, authorHandle: string) => {
    const isCurrentlyFollowing = !!followingMap[authorId]
    const nextState = !isCurrentlyFollowing
    setFollowingMap(prev => ({ ...prev, [authorId]: nextState }))
    haptic(10);
    playLikePop();
    triggerFeedback(
      'follow',
      nextState ? `Tracking @${authorHandle}` : `Unfollowed @${authorHandle}`,
      nextState ? '✓' : '＋'
    )
    showToast(nextState ? `Orbit locked: Tracking @${authorHandle}` : `Stopped tracking @${authorHandle}`)
    await toggleFollow(authorId)
  }

  // Handle Double Tap -> Toggle Comments Overlay
  const handleDoubleTap = () => {
    haptic(8);
    playToggleTick();
    if (pendingPin) {
      setIsAddingComment(true)
    } else {
      setShowComments(prev => {
        const next = !prev
        triggerFeedback(
          'comments',
          next ? 'Localized Notes Revealed' : 'Notes Concealed',
          next ? '💬' : '👁️'
        )
        return next
      })
    }
  }

  // Handle Long Press -> Open comment box at (xPercent, yPercent)
  const handleLongPressTrigger = (clientX: number, clientY: number, targetCard: HTMLElement, postId: string) => {
    // Only allow commenting if we are in comment viewing state (after double tap)
    if (!showComments) {
      showToast('Double tap first to reveal notes before pinning!')
      return
    }

    const rect = targetCard.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const xPercent = Math.max(8, Math.min(85, (x / rect.width) * 100))
    const yPercent = Math.max(10, Math.min(85, (y / rect.height) * 100))

    setPendingPin({
      postId,
      xPercent,
      yPercent
    })
    setIsAddingComment(false)
    setPinCommentText('')
  }

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingPin || !pinCommentText.trim() || isSubmittingPin) return

    setIsSubmittingPin(true)
    const { postId, xPercent, yPercent } = pendingPin
    const text = pinCommentText.trim()

    // Optimistic comment
    const tempId = `temp-${Date.now()}`
    const tempComment: ReelComment = {
      id: tempId,
      content: text,
      xPercent,
      yPercent,
      userId: currentUser?.id || 'anon',
      user: {
        id: currentUser?.id || 'anon',
        username: currentUser?.username || 'You',
        handle: currentUser?.handle || 'me',
        avatarUrl: currentUser?.avatarUrl,
        color: currentUser?.color || 'green',
      }
    }

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          reelComments: [...(post.reelComments || []), tempComment]
        }
      }
      return post
    }))

    setPendingPin(null)
    setIsAddingComment(false)
    setPinCommentText('')
    setIsSubmittingPin(false)
    showToast('Localized note pinned onto transmission!')

    try {
      const res = await addReelComment(postId, text, xPercent, yPercent)
      if (res?.comment) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              reelComments: (post.reelComments || []).map(c => c.id === tempId ? res.comment : c)
            }
          }
          return post
        }))
      }
    } catch (err) {
      console.error('Failed to add pin:', err)
    }
  }

  // Pointer & Touch Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, postId: string, authorId: string, authorHandle: string) => {
    // If clicking on existing tooltip or input box, ignore
    if ((e.target as HTMLElement).closest('.pin-interactive')) return

    const clientX = e.clientX
    const clientY = e.clientY
    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() }
    isDraggingRef.current = false

    const card = e.currentTarget
    currentCardRef.current = card

    // Setup Long Press Timer (450ms)
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current && touchStartRef.current) {
        handleLongPressTrigger(clientX, clientY, card, postId)
        touchStartRef.current = null
      }
    }, 450)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return
    const deltaX = Math.abs(e.clientX - touchStartRef.current.x)
    const deltaY = Math.abs(e.clientY - touchStartRef.current.y)

    if (deltaX > 10 || deltaY > 10) {
      isDraggingRef.current = true
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, postId: string, authorId: string, authorHandle: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!touchStartRef.current) return

    const deltaX = e.clientX - touchStartRef.current.x
    const deltaY = e.clientY - touchStartRef.current.y
    const elapsed = Date.now() - touchStartRef.current.time
    touchStartRef.current = null

    // Horizontal Swipe Detection
    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && elapsed < 500) {
      if (deltaX < 0) {
        // Swipe Left -> Save
        handleSwipeLeft(postId)
      } else {
        // Swipe Right -> Follow
        handleSwipeRight(authorId, authorHandle)
      }
      return
    }

    // Double Tap Detection
    if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && elapsed < 300) {
      const now = Date.now()
      if (now - lastTapRef.current < 320) {
        handleDoubleTap()
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
        // Single tap closes any open comment tooltip
        setTimeout(() => {
          if (lastTapRef.current === now) {
            setActiveTooltipId(null)
          }
        }, 340)
      }
    }
  }

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora'
      case 'mars-landscape': return 'mars-landscape'
      case 'ocean': return 'ocean'
      default: return 'aurora'
    }
  }

  return (
    <div
      data-hide-topbar="true"
      data-reel-viewer="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: '#000',
        zIndex: 50,
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Sleek Floating Home / Back Button */}
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          left: '18px',
          zIndex: 60,
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        title="Return to Feed"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </Link>

      {/* Edge-to-Edge Fullscreen Reel Container */}
      <div
        ref={containerRef}
        onScroll={(e) => {
          const target = e.currentTarget;
          const newIdx = Math.round(target.scrollTop / target.clientHeight);
          if (newIdx !== activeIdx) setActiveIdx(newIdx);
        }}
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          position: 'relative'
        }}
      >
        {posts.map((post, idx) => {
          const isSaved = !!savedMap[post.id]
          const isFollowing = !!followingMap[post.authorId]
          const comments = post.reelComments || []

          return (
            <div
              key={post.id}
              id={`reel-${post.id}`}
              onPointerDown={(e) => handlePointerDown(e, post.id, post.authorId, post.author.handle)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, post.id, post.authorId, post.author.handle)}
              style={{
                height: '100%',
                minHeight: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                touchAction: 'pan-y'
              }}
            >
              {/* Media Background with Active Windowing (Decaches offscreen RAM) */}
              <div className={(post as any).visualFilter || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {Math.abs(idx - activeIdx) <= 1 ? (
                  post.mediaUrl ? (() => {
                    const mediaList = post.mediaUrl.split(',');
                    const safeUrl = mediaList[0];
                    
                    return safeUrl.match(/\.(mp4|webm|ogg|mov)$/i) || safeUrl.includes('#video') || post.mediaType === 'reel' || post.mediaType === 'video' ? (
                      <VideoPlayer src={safeUrl} musicTrack={(post as any).musicTrack} posterUrl={(post as any).thumbnailUrl || (post as any).posterUrl} />
                    ) : (
                      <img
                        src={safeUrl}
                        alt="Reel Media"
                        loading="lazy"
                        decoding="async"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    );
                  })() : (
                    <div
                      className={`post-media ${getMediaClass(post.mediaType)}`}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at 50% 50%, #0c1829 0%, #050b14 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--earth)', animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>

              {/* Ambient Dark Gradient for Typography */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 35%, rgba(7, 17, 31, 0.95) 88%)',
                pointerEvents: 'none'
              }} />

              {/* Options Button */}
              

              {/* Comments / Localized Notes Button (Above Share) */}
              <button
                type="button"
                className="pin-interactive"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentsDrawerPostId(post.id);
                }}
                style={{
                  position: 'absolute',
                  bottom: 'calc(94px + env(safe-area-inset-bottom, 16px))',
                  right: '18px',
                  background: 'rgba(7, 17, 31, 0.85)',
                  color: 'var(--earth)',
                  border: '1.5px solid var(--earth)',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  zIndex: 50,
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 16px rgba(64, 201, 162, 0.25)',
                  transition: 'transform 0.15s ease, background 0.2s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                aria-label="View Transmission Notes"
                title="View Localized Notes & Discussion"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>
                {(post.reelComments?.length || 0) > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--earth)',
                    color: '#07111f',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '100px',
                    padding: '1px 6px',
                    border: '1.5px solid #07111f'
                  }}>
                    {post.reelComments!.length}
                  </span>
                )}
              </button>

              {/* Share Button (Bottom Right) */}
              <button
                type="button"
                className="pin-interactive"
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSharePostId(post.id);
                }}
                style={{
                  position: 'absolute',
                  bottom: 'calc(32px + env(safe-area-inset-bottom, 16px))',
                  right: '18px',
                  background: 'rgba(7, 17, 31, 0.85)',
                  color: 'var(--earth)',
                  border: '1.5px solid var(--earth)',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  zIndex: 50,
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 16px rgba(64, 201, 162, 0.25)',
                  transition: 'transform 0.15s ease, background 0.2s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                aria-label="Share Reel"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>


              {/* Top Saved Status Indicator */}
              {isSaved && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '68px',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(244, 201, 93, 0.2)',
                    color: 'var(--yellow)',
                    border: '1px solid var(--yellow)',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    Saved
                  </span>
                </div>
              )}

              {/* ───────── Spatial Comments (Max 20 Pins) ───────── */}
              {showComments && (post.reelComments || []).slice(0, 20).map((comment) => {
                const isOpen = activeTooltipId === comment.id
                return (
                  <div
                    key={comment.id}
                    className="pin-interactive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveCommentsDrawerPostId(post.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: `${comment.xPercent}%`,
                      top: `${comment.yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isOpen ? 40 : 20
                    }}
                  >
                    {/* Pill-shaped Pin */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px 2px 3px',
                      borderRadius: '100px',
                      background: 'rgba(7, 17, 31, 0.45)',
                      border: isOpen ? '1px solid var(--earth)' : '1px solid rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(4px)',
                      boxShadow: isOpen ? '0 0 12px rgba(64, 201, 162, 0.4)' : '0 2px 6px rgba(0,0,0,0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease',
                      transform: isOpen ? 'scale(1.05)' : 'scale(1)',
                      maxWidth: '110px'
                    }}>
                      <div className={`user-avatar ${comment.user?.color || 'green'}`} style={{
                        width: '15px', height: '15px', fontSize: '0.5rem', flexShrink: 0, opacity: 0.7, borderRadius: '50%'
                      }}>
                        {comment.user?.avatarUrl?.startsWith?.('http') ? <img src={comment.user?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', opacity: 0.7 }} alt='avatar' /> : (comment.user?.avatarUrl || comment.user?.username?.charAt(0).toUpperCase() || '✦')}
                      </div>
                      <div style={{
                        color: 'rgba(243, 247, 251, 0.85)',
                        fontSize: '0.62rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {comment.content.split(' ').slice(0, 3).join(' ')}
                        {comment.content.split(' ').length > 3 ? '...' : ''}
                      </div>
                    </div>

                    {/* Expanded Tooltip Speech Bubble */}
                    {isOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: '125%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          minWidth: '170px',
                          maxWidth: '230px',
                          padding: '8px 12px',
                          borderRadius: '14px',
                          background: 'rgba(11, 23, 39, 0.88)',
                          backdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                          color: 'var(--text)',
                          zIndex: 40,
                          animation: 'fadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {comment.user?.username}
                          </span>
                          <span style={{ color: 'var(--earth)', fontSize: '0.68rem' }}>
                            @{comment.user?.handle}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', margin: 0, lineHeight: 1.35, color: 'rgba(243, 247, 251, 0.9)' }}>
                          {comment.content}
                        </p>
                        {/* Down Arrow */}
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          borderLeft: '5px solid transparent',
                          borderRight: '5px solid transparent',
                          borderTop: '5px solid rgba(255, 255, 255, 0.15)'
                        }} />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* ───────── Scrollable Overflow List (> 20 Comments) ───────── */}
              {showComments && (post.reelComments?.length || 0) > 20 && (
                <div style={{
                  position: 'absolute',
                  bottom: '120px',
                  right: '20px',
                  width: '260px',
                  maxHeight: '35vh',
                  background: 'rgba(11, 23, 39, 0.85)',
                  backdropFilter: 'blur(25px)',
                  border: '1px solid var(--line)',
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  zIndex: 35,
                  boxShadow: '0 15px 40px rgba(0,0,0,0.7)'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--earth)' }}>
                    All Notes ({post.reelComments!.length})
                  </div>
                  <div style={{ overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {post.reelComments!.map(comment => (
                      <div key={`list-${comment.id}`} style={{ display: 'flex', gap: '10px' }}>
                        <div className={`user-avatar ${comment.user?.color || 'green'}`} style={{ width: '18px', height: '18px', flexShrink: 0, fontSize: '0.6rem', opacity: 0.7, borderRadius: '50%' }}>
                          {comment.user?.avatarUrl?.startsWith?.('http') ? <img src={comment.user?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', opacity: 0.7 }} alt='avatar' /> : (comment.user?.avatarUrl || comment.user?.username?.charAt(0).toUpperCase())}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>@{comment.user?.handle}</div>
                          <div style={{ fontSize: '0.8rem', color: '#f3f7fb', lineHeight: 1.3 }}>{comment.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ───────── Pending Pin Comment Creator ───────── */}
              {pendingPin && pendingPin.postId === post.id && (
                <div
                  className={isAddingComment ? "pin-interactive" : ""}
                  onClick={(e) => { if (isAddingComment) e.stopPropagation(); }}
                  style={{
                    position: 'absolute',
                    left: `${pendingPin.xPercent}%`,
                    top: `${pendingPin.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 50,
                    animation: 'fadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease',
                    pointerEvents: isAddingComment ? 'auto' : 'none'
                  }}
                >
                  {/* Pin Target Beacon */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--earth)',
                    color: '#07111f',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                    margin: '0 auto 8px',
                    boxShadow: '0 0 25px var(--earth)',
                    animation: 'pulse 1s infinite'
                  }}>
                    📍
                  </div>

                  {/* Glassmorphic Comment Popover */}
                  {isAddingComment && (
                    <form
                      onSubmit={handleCreatePin}
                      style={{
                        width: '230px',
                        padding: '12px',
                        borderRadius: '18px',
                        background: 'rgba(11, 23, 39, 0.96)',
                        backdropFilter: 'blur(20px)',
                        border: '1.5px solid var(--earth)',
                        boxShadow: '0 16px 45px rgba(0,0,0,0.85)'
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: 'var(--earth)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Pin Note at this coordinate
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={pinCommentText}
                        onChange={(e) => setPinCommentText(e.target.value)}
                        placeholder="Type localized note..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid var(--line)',
                          color: 'white',
                          fontSize: '0.84rem',
                          outline: 'none',
                          marginBottom: '8px'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { setPendingPin(null); setIsAddingComment(false); }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '100px',
                            background: 'rgba(0,0,0,0.08)',
                            color: 'var(--muted)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingPin || !pinCommentText.trim()}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '100px',
                            background: 'var(--earth)',
                            color: '#07111f',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            opacity: isSubmittingPin || !pinCommentText.trim() ? 0.5 : 1
                          }}
                        >
                          {isSubmittingPin ? '...' : 'Drop'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Bottom Content Metadata Overlay */}
              <div style={{
                position: 'relative',
                zIndex: 10,
                padding: '24px 20px calc(28px + env(safe-area-inset-bottom, 16px))',
                pointerEvents: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div className={`user-avatar ${post.author.color || 'green'}`} style={{ width: '38px', height: '38px', fontSize: '0.9rem', flexShrink: 0 }}>
                    {post.author.avatarUrl?.startsWith?.('http') ? <img src={post.author.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (post.author.avatarUrl || post.author.username.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'white' }}>
                      {post.author.username}
                    </div>
                    <div style={{ color: 'var(--earth)', fontSize: '0.76rem' }}>
                      @{post.author.handle} {isFollowing && '• Following'}
                    </div>
                  </div>
                </div>

                <p style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  color: '#eaf1f8',
                  marginBottom: '10px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {post.content}
                </p>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '0.72rem',
                  color: 'var(--muted)',
                  border: '1px solid var(--line)'
                }}>
                  <span>♫</span>
                  <span>Interplanetary Synth • {post.channel || 'Earth'} Relay</span>
                </div>
              </div>
            </div>
          )
        })}

        {posts.length === 0 && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '30px',
            textAlign: 'center',
            color: 'var(--muted)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7"/>
                <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-25 12 12)"/>
              </svg>
            </div>
            <h3 style={{ color: 'var(--text)', marginBottom: '6px' }}>No Cosmic Reels Yet</h3>
            <p style={{ fontSize: '0.85rem' }}>Broadcast the first reel transmission from the Home feed!</p>
          </div>
        )}
      </div>

      {/* ───────── Central Gesture Feedback HUD Overlay ───────── */}
      {gestureFeedback && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(11, 23, 39, 0.92)',
          border: '2px solid var(--earth)',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          padding: '20px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          zIndex: 100,
          animation: 'fadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease-out'
        }}>
          <span style={{ fontSize: '2.5rem' }}>{gestureFeedback.icon}</span>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'white', textAlign: 'center' }}>
            {gestureFeedback.label}
          </span>
        </div>
      )}

      {/* ───────── Share Modal Overlay ───────── */}
      {sharePostId && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSharePostId(null)
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            style={{
              background: 'var(--panel-solid)',
              border: '1px solid var(--line)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            <button
              onClick={() => setSharePostId(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px', background: 'none',
                border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer',
                padding: '4px 8px'
              }}
            >✕</button>
            
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              Transmit Reel
            </h3>

            {/* Quick Copy Link Action */}
            <button
              onClick={handleCopyLink}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '100px',
                border: '1px solid var(--line)',
                background: 'rgba(197, 160, 89, 0.12)',
                color: 'var(--earth)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: '0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(197, 160, 89, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(197, 160, 89, 0.12)')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Copy Reel Link</span>
            </button>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Search astronaut by name or @handle..."
                value={shareSearchQuery}
                onChange={(e) => handleShareSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 18px 12px 42px',
                  borderRadius: '100px',
                  background: 'rgba(28, 25, 20, 0.04)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {shareSearchQuery.trim() ? 'Search Results' : 'Following & Close Contacts'}
            </div>
            
            {isSearchingShare ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '0.85rem' }}>Scanning frequencies...</div>
            ) : shareUsers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {shareUsers.map(u => {
                  const sendStatus = sendingShareUserIds[u.id]
                  return (
                    <button
                      key={u.id}
                      disabled={!!sendStatus}
                      onClick={() => handleShareToUser(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                        background: sendStatus === 'sent' ? 'rgba(64, 201, 162, 0.12)' : 'rgba(28, 25, 20, 0.03)',
                        borderRadius: '14px',
                        border: sendStatus === 'sent' ? '1px solid var(--earth)' : '1px solid var(--line)',
                        cursor: sendStatus ? 'default' : 'pointer',
                        textAlign: 'left',
                        transition: '0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <div className={`user-avatar ${u.color || 'green'}`} style={{ width: '38px', height: '38px', fontSize: '0.9rem', flexShrink: 0 }}>
                        {u.avatarUrl?.startsWith?.('http') ? <img src={u.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (u.avatarUrl || u.username?.charAt(0))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</div>
                        <div style={{ color: 'var(--earth)', fontSize: '0.74rem' }}>@{u.handle}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {sendStatus === 'sending' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '100px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--muted)', fontSize: '0.76rem', fontWeight: 600
                          }}>
                            <span style={{
                              width: '10px', height: '10px', borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--earth)',
                              animation: 'spin 0.8s linear infinite', display: 'inline-block'
                            }} />
                            Sending...
                          </span>
                        ) : sendStatus === 'sent' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 14px', borderRadius: '100px',
                            background: 'rgba(64, 201, 162, 0.2)',
                            border: '1px solid var(--earth)',
                            color: 'var(--earth)', fontSize: '0.76rem', fontWeight: 700
                          }}>
                            Sent! ✓
                          </span>
                        ) : (
                          <div style={{
                            background: 'var(--earth)', color: '#07111f',
                            padding: '6px 14px', borderRadius: '100px',
                            fontSize: '0.76rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '5px'
                          }}>
                            <span>Send</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : shareSearchQuery.length >= 1 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '0.85rem' }}>No matching astronauts found.</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                No recent contacts found. Type a handle to search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {saveModalPostId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '20px'
        }} onClick={() => setSaveModalPostId(null)}>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '24px', padding: '24px',
            maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text)' }}>Archive Coordinates</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
              How would you like to save this transmission?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => confirmSave(saveModalPostId, true)} style={{
                padding: '12px', borderRadius: '12px', border: '1px solid var(--earth)', background: 'rgba(197, 160, 89, 0.1)',
                color: 'var(--earth)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <span style={{ fontSize: '1.05rem' }}>Public Archive</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>Visible on your profile</span>
              </button>
              <button onClick={() => confirmSave(saveModalPostId, false)} style={{
                padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)',
                color: 'var(--text)', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <span style={{ fontSize: '1.05rem' }}>Private Vault</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 400 }}>Only you can see this</span>
              </button>
            </div>
            <button onClick={() => setSaveModalPostId(null)} style={{
              marginTop: '16px', padding: '8px 20px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer'
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ───────── Slide-Up Comments Drawer (Silences Audio On Open, Resumes On Close) ───────── */}
      {activeCommentsDrawerPostId && (() => {
        const currentDrawerPost = posts.find(p => p.id === activeCommentsDrawerPostId)
        return (
          <div
            onClick={() => setActiveCommentsDrawerPostId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 100005,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <style>{`
              @keyframes slideUpDrawer {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '560px',
                margin: '0 auto',
                background: 'linear-gradient(180deg, rgba(14, 25, 43, 0.98), rgba(7, 17, 31, 0.99))',
                borderTop: '1.5px solid var(--earth)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.7)',
                maxHeight: '75vh',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                animation: 'slideUpDrawer 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Grab Handle */}
              <div style={{ padding: '12px 0 6px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.25)' }} />
              </div>

              {/* Drawer Header */}
              <div style={{
                padding: '6px 20px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text)', fontWeight: 700 }}>
                    Transmission Notes
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: 'var(--earth)' }}>
                    Audio silenced • {currentDrawerPost?.reelComments?.length || 0} notes
                  </span>
                </div>
                <button
                  onClick={() => setActiveCommentsDrawerPostId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '1.3rem',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                  title="Close and resume audio"
                >
                  ✕
                </button>
              </div>

              {/* Full Comments List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: '180px'
              }}>
                {(!currentDrawerPost?.reelComments || currentDrawerPost.reelComments.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--muted)', fontSize: '0.86rem' }}>
                    No localized notes on this coordinate yet. Long press anywhere on the video or type below to pin one!
                  </div>
                ) : (
                  currentDrawerPost.reelComments.map((c) => (
                    <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div className={`user-avatar ${c.user?.color || 'green'}`} style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, fontSize: '0.8rem' }}>
                        {c.user?.avatarUrl?.startsWith?.('http') ? (
                          <img src={c.user?.avatarUrl} alt={c.user?.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          c.user?.avatarUrl || c.user?.username?.charAt(0).toUpperCase() || '✦'
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
                            {c.user?.username}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--earth)' }}>
                            @{c.user?.handle}
                          </span>
                          {c.xPercent !== undefined && c.yPercent !== undefined && (
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: '100px',
                              background: 'rgba(64, 201, 162, 0.15)',
                              color: 'var(--earth)',
                              border: '1px solid rgba(64, 201, 162, 0.3)'
                            }}>
                              📍 {Math.round(c.xPercent)}%, {Math.round(c.yPercent)}%
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.45, color: '#f3f7fb', wordBreak: 'break-word' }}>
                          {renderWithMentions(c.content)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToComment({
                                id: c.id,
                                username: c.user?.username || 'User',
                                handle: c.user?.handle || 'user'
                              });
                              const mentionTag = `@${c.user?.handle || ''} `;
                              if (!drawerCommentText.startsWith(mentionTag)) {
                                setDrawerCommentText(mentionTag + drawerCommentText);
                              }
                              setTimeout(() => drawerCommentInputRef.current?.focus(), 50);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--earth)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 17 4 12 9 7" />
                              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Add Note Form with @Mention Autocomplete & Reply chip */}
              <form
                onSubmit={handleDrawerAddComment}
                style={{
                  padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 12px))',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'rgba(7, 17, 31, 0.95)'
                }}
              >
                {replyingToComment && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(64, 201, 162, 0.12)',
                    border: '1px solid rgba(64, 201, 162, 0.3)',
                    fontSize: '0.75rem',
                    color: 'var(--earth)'
                  }}>
                    <span>Replying to <strong>@{replyingToComment.handle}</strong></span>
                    <button
                      type="button"
                      onClick={() => setReplyingToComment(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '0 4px',
                        fontSize: '0.85rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <input
                      ref={drawerCommentInputRef}
                      type="text"
                      value={drawerCommentText}
                      onChange={(e) => setDrawerCommentText(e.target.value)}
                      onKeyDown={drawerMention.handleKeyDown}
                      placeholder={replyingToComment ? `Reply to @${replyingToComment.handle}...` : "Add a localized transmission note... (type @)"}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 16px',
                        borderRadius: '100px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--line)',
                        color: 'white',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    />
                    {drawerMention.isOpen && (
                      <MentionDropdown
                        users={drawerMention.users}
                        selectedIndex={drawerMention.selectedIndex}
                        onSelect={drawerMention.selectUser}
                        isLoading={drawerMention.isLoading}
                      />
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingDrawerComment || !drawerCommentText.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '100px',
                      background: 'var(--earth)',
                      color: '#07111f',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      border: 'none',
                      cursor: isSubmittingDrawerComment ? 'wait' : 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {isSubmittingDrawerComment ? '...' : 'Post Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
    </div>
  )
}






