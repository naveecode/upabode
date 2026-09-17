"use client";

import { useState, useRef, useEffect } from "react";
import { toggleLike, toggleFollow } from "../app/actions";
import { showToast } from "./Toast";
import { releaseVideoMemory } from "../lib/mediaMemoryManager";
import Link from "next/link";
import ThreadCommentTree from "./ThreadCommentTree";

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!audioRef.current) return;
        if (entry.intersectionRatio > 0.6) {
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      });
    }, { threshold: [0.6] });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleAudio = (e: React.MouseEvent) => {
    if(e && e.stopPropagation) e.stopPropagation();
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 20 }}>
      <audio
        ref={audioRef}
        src={src}
        loop
        onPlay={(e) => {
          setIsPlaying(true);
          const target = e.target as HTMLAudioElement;
          document.querySelectorAll('video, audio').forEach(media => {
            if (media !== target) (media as HTMLMediaElement).pause();
          });
        }}
        onPause={() => setIsPlaying(false)}
      />
      <button
        onClick={toggleAudio}
        style={{
          width: '40px', height: '40px', borderRadius: '50%', background: isPlaying ? 'var(--earth)' : 'rgba(0,0,0,0.6)',
          border: '1px solid var(--earth)', color: isPlaying ? '#000' : 'var(--earth)', fontSize: '1.2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
    </div>
  );
}

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (videoRef.current && videoRef.current.paused) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              }
            }
          } else {
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.6 } // Needs to be 60% visible to autoplay
    );

    const videoEl = videoRef.current;
    if (videoEl) observer.observe(videoEl);
    return () => {
      observer.disconnect();
      if (videoEl) releaseVideoMemory(videoEl);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        onPlay={(e) => {
          setIsPlaying(true);
          const target = e.target as HTMLVideoElement;
          document.querySelectorAll('video, audio').forEach(media => {
            if (media !== target) (media as HTMLMediaElement).pause();
          });
        }}
        onPause={() => setIsPlaying(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {!isPlaying && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
          backdropFilter: 'blur(4px)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      )}
    </div>
  );
}

export default function Post({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const initialLiked = currentUserId && post.likes ? post.likes.some((l: any) => l.userId === currentUserId) : false;
  const initialFollowing = currentUserId && post.author?.followers ? post.author.followers.some((f: any) => f.followerId === currentUserId) : false;
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isArchived, setIsArchived] = useState(post.archived);

  // Thread & Comments state
  const isThreadPost = post.mediaType === 'thread' || (!post.mediaUrl && post.mediaType !== 'reel' && post.mediaType !== 'video');
  const [comments, setComments] = useState<any[]>(post.reelComments || []);
  const [showComments, setShowComments] = useState(isThreadPost);

  // Parse rich styling if thread post
  let textTheme = { bg: 'rgba(255,255,255,0.03)', color: 'var(--text)', border: 'var(--line)' };
  let textFont = 'var(--font-body), sans-serif';
  let textSize = '1.02rem';
  let lineHeight = '1.65';

  if (isThreadPost && post.visualFilter) {
    try {
      const parsed = JSON.parse(post.visualFilter);
      if (parsed.font === 'serif') textFont = 'var(--font-heading), Georgia, serif';
      else if (parsed.font === 'space') textFont = 'var(--font-space-grotesk), monospace';
      else if (parsed.font === 'mono') textFont = 'monospace';

      if (parsed.theme === 'gold') {
        textTheme = { bg: 'linear-gradient(145deg, #1C1914, #2A241C)', color: '#F3F0E9', border: '#C5A059' };
      } else if (parsed.theme === 'void') {
        textTheme = { bg: 'linear-gradient(145deg, #07111F, #0D1C2E)', color: '#F3F7FB', border: 'rgba(64, 201, 162, 0.4)' };
      } else if (parsed.theme === 'emerald') {
        textTheme = { bg: 'linear-gradient(145deg, #0C211E, #14352F)', color: '#E2F3EE', border: '#40C9A2' };
      } else if (parsed.theme === 'nebula') {
        textTheme = { bg: 'linear-gradient(145deg, #1F1128, #2B1838)', color: '#F8EEFC', border: '#B85C5C' };
      }

      if (parsed.size === 'title') textSize = '1.35rem';
      else if (parsed.size === 'large') textSize = '1.15rem';
    } catch {}
  }

  // Carousel slide index
  const mediaList = post.mediaUrl ? post.mediaUrl.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const [currentSlide, setCurrentSlide] = useState(0);

  const zoneRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.targetTouches[0].clientX; touchEndX.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => { if(touchStartX.current - touchEndX.current > 50) { nextSlide(new Event('swipe') as any); } if(touchEndX.current - touchStartX.current > 50) { prevSlide(new Event('swipe') as any); } touchStartX.current = 0; touchEndX.current = 0; };

  const handleLike = async (fromSwipe = false) => {
    setIsLiked(!isLiked);
    setLikesCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    if (fromSwipe) showToast(!isLiked ? "Signal liked" : "Like removed");
    await toggleLike(post.id);
  };

  const handleFollow = async (fromSwipe = false) => {
    setIsFollowing(!isFollowing);
    if (fromSwipe)
      showToast(!isFollowing ? "Now tracking this signal (followed)" : "Unfollowed signal");
    await toggleFollow(post.authorId);
  };

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora';
      case 'mars-landscape': return 'mars-landscape';
      case 'ocean': return 'ocean';
      default: return 'aurora';
    }
  };

  const nextSlide = (e: React.MouseEvent) => {
    if(e && e.stopPropagation) e.stopPropagation();
    if (currentSlide < mediaList.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = (e: React.MouseEvent) => {
    if(e && e.stopPropagation) e.stopPropagation();
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const [showOptions, setShowOptions] = useState(false);
  
  const handleEdit = async () => {
    const newContent = prompt('Edit your transmission:', post.content);
    if (newContent !== null && newContent !== post.content) {
      // Need to import editPostContent from actions
      const { editPostContent } = await import('../app/actions');
      await editPostContent(post.id, newContent);
      window.location.reload();
    }
    setShowOptions(false);
  };

  const handleDelete = async () => {
    if (confirm('Permanently delete this transmission?')) {
      setIsDeleted(true);
      const { deletePost } = await import('../app/actions');
      await deletePost(post.id);
    }
    setShowOptions(false);
  };

  const handleArchive = async () => {
    setIsArchived(!isArchived);
    const { archivePost } = await import('../app/actions');
    await archivePost(post.id);
    setShowOptions(false);
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareUsers, setShareUsers] = useState<any[]>([]);
  const [isSearchingShare, setIsSearchingShare] = useState(false);

  const handleShareSearch = async (query: string) => {
    setShareSearchQuery(query);
    if (query.length < 2) {
      setShareUsers([]);
      return;
    }
    setIsSearchingShare(true);
    const { searchUsers } = await import('../app/actions');
    const results = await searchUsers(query);
    setIsSearchingShare(false);
    if (!results.error) {
      setShareUsers(results.users || []);
    }
  };

  const handleShareToUser = async (userId: string) => {
    const { startChat, shareReelToChat } = await import('../app/actions');
    const chat = await startChat(userId);
    if (chat && chat.chatId) {
      await shareReelToChat(post.id, chat.chatId);
      showToast('Transmission shared to secure channel!');
      setShowShareModal(false);
    } else {
      showToast('Error sharing transmission.');
    }
  };

  const handleShare = () => {
    setShowOptions(false);
    setShowShareModal(true);
  };

  const handleDownload = () => {
    if (!post.mediaUrl) return;
    const a = document.createElement('a');
    a.href = post.mediaUrl;
    a.download = `upabode-orbit-${post.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowOptions(false);
  };

  if (isDeleted) return null;

  return (
    <article className="post" data-post-id={post.id} style={{ opacity: isArchived ? 0.6 : 1 }}>
      <div className="post-header" style={{ position: 'relative' }}>
        <Link href={`/profile/${post.author?.handle}`} className="user" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div 
            className={`user-avatar ${post.author?.color || 'green'}`}
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
              justifyContent: 'center'
            }}
          >
            {post.author?.avatarUrl?.startsWith?.('http') ? <img src={post.author?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (post.author?.avatarUrl || post.author?.username?.charAt(0).toUpperCase())}
          </div>
          <div className="user-details">
            <span className="username">{post.author?.username || post.author?.handle}</span>
            <span className="user-meta">@{post.author?.handle} • {new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isArchived && (
            <span style={{ fontSize: '0.72rem', color: 'var(--earth)', background: 'rgba(197, 160, 89, 0.1)', padding: '3px 8px', borderRadius: '100px', fontWeight: 600 }}>
              Private
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--earth)', background: 'rgba(64, 201, 162, 0.1)', padding: '3px 8px', borderRadius: '100px', fontWeight: 600 }}>
            {post.channel || 'earth'}
          </span>
          
          {/* Post Options Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOptions(!showOptions)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}
            >
              ⋮
            </button>
            {showOptions && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px',
                padding: '8px', zIndex: 100, minWidth: '160px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                {currentUserId === post.authorId && (
                  <>
                    <button onClick={handleEdit} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>✏️ Edit Content</button>
                    <button onClick={handleArchive} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>📦 {post.archived ? 'Make Public' : 'Make Private'}</button>
                    <button onClick={handleDelete} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '8px', transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,107,122,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>🗑️ Delete</button>
                  </>
                )}
                <button onClick={handleShare} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Share
                </button>
                {post.mediaUrl && (
                  <button onClick={handleDownload} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>⬇️ Download Media</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swipe Zone / Media Area / Carousel or Native Stylized Text Post */}
      {isThreadPost ? (
        <div
          style={{
            padding: '24px 28px',
            background: textTheme.bg,
            color: textTheme.color,
            border: `1.5px solid ${textTheme.border}`,
            borderRadius: '20px',
            margin: '12px 0 16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          <div
            style={{
              fontFamily: textFont,
              fontSize: textSize,
              lineHeight: lineHeight,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontWeight: textSize === '1.35rem' ? 600 : 400,
              letterSpacing: textFont.includes('space') ? '0.02em' : 'normal'
            }}
          >
            {post.content}
          </div>
        </div>
      ) : (
        <div
          ref={zoneRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`post-media ${mediaList.length === 0 ? getMediaClass(post.mediaType) : ''} ${post.visualFilter || ''}`}
          data-swipe-zone
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {post.musicTrack && (
            <AudioPlayer src={post.musicTrack} />
          )}
          
          {/* Render Carousel or Single Media Image */}
          {mediaList.length > 0 ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {mediaList[currentSlide].match(/\.(mp4|webm|ogg|mov)$/i) || mediaList[currentSlide].includes('#video') || post.mediaType === 'reel' || post.mediaType === 'video' ? (
                <VideoPlayer src={mediaList[currentSlide]} />
              ) : (
                <img
                  src={mediaList[currentSlide]}
                  alt={`Transmission slide ${currentSlide + 1}`}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    transition: 'opacity 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                  }}
                />
              )}

              {/* Carousel navigation arrows if multiple slides */}
              {mediaList.length > 1 && (
                <>
                  {currentSlide > 0 && (
                    <button
                      onClick={prevSlide}
                      className="carousel-nav-btn"
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.65)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        zIndex: 10
                      }}
                    >
                      ‹
                    </button>
                  )}

                  {currentSlide < mediaList.length - 1 && (
                    <button
                      onClick={nextSlide}
                      className="carousel-nav-btn"
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.65)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        zIndex: 10
                      }}
                    >
                      ›
                    </button>
                  )}

                  {/* Dot indicators */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '6px',
                    zIndex: 10
                  }}>
                    {mediaList.map((_: any, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          width: idx === currentSlide ? '18px' : '6px',
                          height: '6px',
                          borderRadius: '100px',
                          background: idx === currentSlide ? 'var(--earth)' : 'rgba(255,255,255,0.4)',
                          transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.3)', fontFamily: 'var(--font-heading)' }}>
                {post.content}
              </h2>
            </div>
          )}

          <div className={`gesture-feedback ${feedback ? "show" : ""}`}>
            {feedback}
          </div>
        </div>
      )}

      <div className="post-actions">
        <button
          className={`action-button like-button ${isLiked ? "liked" : ""}`}
          onClick={() => handleLike(false)}
        >
          <span className="action-icon">{isLiked ? "♥" : "♡"}</span>
          <span>Like</span>
        </button>

        <button
          className={`action-button follow-button ${
            isFollowing ? "following" : ""
          }`}
          onClick={() => handleFollow(false)}
        >
          <span className="action-icon">{isFollowing ? "✓" : "＋"}</span>
          <span>{isFollowing ? "Following" : "Follow"}</span>
        </button>

        <button
          className={`action-button ${showComments ? "active" : ""}`}
          onClick={() => setShowComments(!showComments)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{comments.length} {comments.length === 1 ? 'Reply' : 'Replies'}</span>
        </button>

        <button
          onClick={async () => {
            if (!currentUserId) {
              window.location.href = '/auth/login';
              return;
            }
            const { startChat } = await import('../app/actions');
            const res = await startChat(post.authorId);
            if (res && res.chatId) {
              window.location.href = `/chat/${res.chatId}`;
            } else {
              window.location.href = '/chat';
            }
          }}
          className="action-button"
          style={{ marginLeft: "auto", background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          title={`Signal directly with @${post.author?.handle}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span>Signal</span>
        </button>
      </div>

      <div className="post-content">
        <div className="post-likes">
          <span className="likes-count">{likesCount.toLocaleString()}</span>{" "}
          likes
        </div>
        {!isThreadPost && (
          <p className="caption">
            <strong>@{post.author?.handle}</strong> {post.content}
          </p>
        )}
        {mediaList.length === 1 && (mediaList[0].match(/\.(mp4|webm|ogg|mov)$/i) || mediaList[0].includes('#video') || post.mediaType === 'reel' || post.mediaType === 'video') && (
          <Link href="/reels" style={{ display: 'inline-block', marginTop: '8px', color: 'var(--earth)', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600 }}>
            Experience in Reels Mode &rarr;
          </Link>
        )}

        {/* Infinitely Expandable Nested Reddit/Threads Style Comments */}
        {showComments && (
          <div style={{ marginTop: '16px', padding: '0 4px' }}>
            <ThreadCommentTree
              comments={comments}
              postId={post.id}
              currentUserId={currentUserId}
              onCommentAdded={(newComment) => {
                setComments(prev => [...prev, newComment]);
              }}
            />
          </div>
        )}
      </div>
      {/* Modern Share Modal */}
      {showShareModal && (
        <div 
          onClick={() => setShowShareModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '24px', padding: '24px', position: 'relative' }}
          >
            <button 
              onClick={() => setShowShareModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}
            >✕</button>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text)' }}>Transmit Post</h3>
            
            <input
              type="text"
              placeholder="Search user by handle or name..."
              value={shareSearchQuery}
              onChange={(e) => handleShareSearch(e.target.value)}
              style={{
                width: '100%', padding: '12px 18px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--line)', color: 'var(--text)', outline: 'none', marginBottom: '16px'
              }}
            />
            
            {isSearchingShare ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Scanning frequencies...</div>
            ) : shareUsers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {shareUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleShareToUser(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                      background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--line)',
                      cursor: 'pointer', textAlign: 'left', transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  >
                    <div className={`user-avatar ${u.color}`} style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                      {u.avatarUrl?.startsWith?.('http') ? <img src={u.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (u.avatarUrl || u.username.charAt(0))}
                    </div>
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem' }}>{u.username}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>@{u.handle}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'var(--earth)', fontSize: '0.8rem', fontWeight: 700 }}>
                      Send ↗
                    </div>
                  </button>
                ))}
              </div>
            ) : shareSearchQuery.length >= 2 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No signals found.</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Type a handle to transmit this post directly to a secure channel.
              </div>
            )}

            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/reels?post=${post.id}`);
                showToast('Link copied!');
              }}
              style={{
                width: '100%', marginTop: '16px', padding: '12px', borderRadius: '100px', background: 'rgba(0,0,0,0.05)',
                color: 'var(--text)', border: '1px solid var(--line)', cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}







