'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { searchContent, toggleLike, toggleFollow } from '../app/actions'

interface ExploreProps {
  initialUsers: any[]
  initialPosts: any[]
  currentUserId?: string
}

export default function ExploreSearch({
  initialUsers,
  initialPosts,
  currentUserId,
}: ExploreProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'reels' | 'texts' | 'carousel' | 'people'>('all')
  const [postsList, setPostsList] = useState<any[]>(initialPosts)
  const [isSearching, setIsSearching] = useState(false)
  const [searchedUsers, setSearchedUsers] = useState<any[]>([])
  const [searchedPosts, setSearchedPosts] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  // Sync postsList when initialPosts change
  useEffect(() => {
    setPostsList(initialPosts)
  }, [initialPosts])

  // Auto-focus search input if navigated with focus=true
  useEffect(() => {
    const q = searchParams?.get('query')
    if (q) setQuery(q)

    if (searchParams?.get('focus') === 'true') {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Selected post for Instagram-style modal viewer
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [selectedPostLiked, setSelectedPostLiked] = useState(false)
  const [selectedPostLikesCount, setSelectedPostLikesCount] = useState(0)
  const [optimisticFollows, setOptimisticFollows] = useState<Record<string, boolean>>({})

  const isFollowing = (user: any) => {
    if (optimisticFollows[user.id] !== undefined) return optimisticFollows[user.id];
    return user.followers?.some((f: any) => f.followerId === currentUserId);
  }

  // Real-time search debounced 300ms
  useEffect(() => {
    if (!query.trim()) {
      setHasSearched(false)
      setSearchedUsers([])
      setSearchedPosts([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await searchContent(query)
        if (res?.success) {
          setSearchedUsers(res.users || [])
          setSearchedPosts(res.posts || [])
          setHasSearched(true)
        }
      } catch (e) {
        console.error('Search failed:', e)
      } finally {
        setIsSearching(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  const openPostModal = (post: any) => {
    setSelectedPost(post)
    const isLiked = currentUserId && post.likes ? post.likes.some((l: any) => l.userId === currentUserId) : false
    setSelectedPostLiked(isLiked)
    setSelectedPostLikesCount(post.likes?.length || 0)
  }

  const handleModalLike = async () => {
    if (!selectedPost) return
    const nextLiked = !selectedPostLiked
    setSelectedPostLiked(nextLiked)
    setSelectedPostLikesCount(prev => nextLiked ? prev + 1 : prev - 1)
    await toggleLike(selectedPost.id)
  }

  const isVideoPost = (p: any) => p.mediaType === 'reel' || p.mediaType === 'video' || (p.mediaUrl && (p.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || p.mediaUrl.includes('#video')));
  const isCarouselPost = (p: any) => p.mediaUrl && p.mediaUrl.includes(',');
  const isTextPost = (p: any) => p.mediaType === 'thread' || (!p.mediaUrl && Boolean(p.content));

  const rawPosts = hasSearched ? searchedPosts : postsList;
  const displayPosts = rawPosts.filter((p: any) => {
    if (activeFilter === 'reels') return isVideoPost(p);
    if (activeFilter === 'texts') return isTextPost(p);
    if (activeFilter === 'carousel') return isCarouselPost(p) || (!isVideoPost(p) && !isTextPost(p) && p.mediaUrl);
    // 'all' preserves visual media AND rich texts
    return true;
  });

  const displayUsers = (hasSearched ? searchedUsers : initialUsers).filter((u: any) => !currentUserId || u.id !== currentUserId)

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora'
      case 'mars-landscape': return 'mars-landscape'
      case 'ocean': return 'ocean'
      default: return 'aurora'
    }
  }

  return (
    <div>
      {/* ───────── Robust Search Engine Bar ───────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--panel)',
          border: '1.5px solid var(--line)',
          borderRadius: '100px',
          padding: '6px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          transition: 'border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
        }}>
          <span style={{ display: 'grid', placeItems: 'center', marginRight: '12px', color: 'var(--earth)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search space anomalies, signals, or users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '1rem',
              outline: 'none',
              padding: '10px 0'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'rgba(0,0,0,0.08)',
                border: 'none',
                color: 'var(--muted)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: '4px'
        }}>
          {[
            {
              id: 'all',
              label: 'All Transmissions',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              )
            },
            {
              id: 'reels',
              label: 'Reels',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              )
            },
            {
              id: 'texts',
              label: 'Rich Texts',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              )
            },
            {
              id: 'carousel',
              label: 'Carousels & Photos',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )
            },
            {
              id: 'people',
              label: 'Creators',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              )
            },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              style={{
                padding: '6px 16px',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: activeFilter === filter.id ? 'var(--earth)' : 'var(--line)',
                background: activeFilter === filter.id ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === filter.id ? 'var(--earth)' : 'var(--muted)',
                fontSize: '0.8rem',
                fontWeight: activeFilter === filter.id ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'grid', placeItems: 'center' }}>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading state indicator */}
      {isSearching && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '0.88rem' }}>
          Scanning cosmic frequencies for &quot;{query}&quot;...
        </div>
      )}

      {/* ───────── Active Explorers Horizontal Carousel ───────── */}
      {(activeFilter === 'all' || activeFilter === 'people') && displayUsers.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              {hasSearched ? `Creators Matching "${query}"` : 'Active Explorers'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {displayUsers.length} discovered
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'none'
          }}>
            {displayUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  minWidth: '170px',
                  maxWidth: '190px',
                  padding: '16px',
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: '20px',
                  textAlign: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(12px)',
                  transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                }}
              >
                <Link href={`/profile/${user.handle}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '10px' }}>
                  <div
                    className={`user-avatar ${user.color || 'green'}`}
                    style={{ width: '54px', height: '54px', margin: '0 auto 10px', fontSize: '1.25rem', color: 'white' }}
                  >
                    {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (user.avatarUrl || user.username?.charAt(0).toUpperCase())}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.username}
                  </div>
                  <div style={{ color: 'var(--earth)', fontSize: '0.76rem', marginBottom: '10px' }}>
                    @{user.handle}
                  </div>
                  {user.location && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>{user.location}</span>
                    </div>
                  )}
                </Link>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!currentUserId) return;
                      setOptimisticFollows(prev => ({ ...prev, [user.id]: !isFollowing(user) }));
                      await toggleFollow(user.id);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '100px',
                      background: isFollowing(user) ? 'rgba(255,255,255,0.08)' : 'rgba(64, 201, 162, 0.15)',
                      border: '1px solid',
                      borderColor: isFollowing(user) ? 'var(--line)' : 'var(--earth)',
                      color: isFollowing(user) ? 'var(--text)' : 'var(--earth)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: '0.2s ease'
                    }}
                  >
                    {isFollowing(user) ? 'Unfollow' : 'Follow'}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!currentUserId) {
                        window.location.href = '/auth/login';
                        return;
                      }
                      const { startChat } = await import('../app/actions');
                      const res = await startChat(user.id);
                      if (res && res.chatId) {
                        window.location.href = `/chat/${res.chatId}`;
                      } else {
                        window.location.href = '/chat';
                      }
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '100px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Direct Signal"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    <span>Signal</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────── Visual & Dossier Discovery Grid ───────── */}
      {activeFilter !== 'people' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              {activeFilter === 'texts'
                ? (hasSearched ? `Rich Texts Matching "${query}"` : 'Cosmic Dossiers & Rich Texts')
                : activeFilter === 'reels'
                ? (hasSearched ? `Reels Matching "${query}"` : 'Spatial Reels Gallery')
                : activeFilter === 'carousel'
                ? (hasSearched ? `Carousels Matching "${query}"` : 'Carousels & Imagery')
                : (hasSearched ? `Transmissions Matching "${query}"` : 'Transmissions Mosaic')}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {displayPosts.length} units
            </span>
          </div>

          {displayPosts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: 'var(--panel)',
              borderRadius: '20px',
              border: '1px dashed var(--line)',
              color: 'var(--muted)'
            }}>
              <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(64, 201, 162, 0.1)', color: 'var(--earth)', marginBottom: '12px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
              </div>
              <div>No transmissions found{query ? ` for "${query}"` : ''}. Try exploring other filters.</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: activeFilter === 'reels'
                ? 'repeat(auto-fill, minmax(180px, 1fr))'
                : activeFilter === 'texts'
                ? 'repeat(auto-fill, minmax(280px, 1fr))'
                : 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '16px',
              gridAutoFlow: 'dense'
            }}>
              {displayPosts.map((post, idx) => {
                const isVideo = isVideoPost(post)
                const isCarousel = isCarouselPost(post)
                const isText = isTextPost(post)
                const safeMediaUrl = post.mediaUrl ? post.mediaUrl.split(',')[0] : ''

                // If this is a rich text transmission, render it as pure typography card (NOT image)
                if (isText && (activeFilter === 'texts' || (!safeMediaUrl && !isVideo))) {
                  return (
                    <div
                      key={post.id}
                      onClick={() => openPostModal(post)}
                      style={{
                        position: 'relative',
                        borderRadius: '20px',
                        background: 'linear-gradient(145deg, rgba(14, 25, 43, 0.85), rgba(6, 12, 23, 0.95))',
                        border: '1px solid var(--line)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '230px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                        transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, border-color 0.25s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.borderColor = 'var(--earth)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.borderColor = 'var(--line)'
                      }}
                    >
                      <div>
                        {/* Sector badge & rich text icon */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '100px',
                            background: 'rgba(64, 201, 162, 0.15)',
                            border: '1px solid var(--line)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: 'var(--earth)',
                            textTransform: 'uppercase'
                          }}>
                            {post.channel || 'dossier'}
                          </span>
                          <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span>Rich Text</span>
                          </span>
                        </div>

                        {/* Text Content */}
                        <p style={{
                          fontSize: '0.94rem',
                          lineHeight: 1.55,
                          color: '#e6edf3',
                          fontFamily: 'var(--font-space-grotesk)',
                          display: '-webkit-box',
                          WebkitLineClamp: 5,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          margin: 0
                        }}>
                          {post.content}
                        </p>
                      </div>

                      {/* Footer: Author & Metrics */}
                      <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className={`user-avatar ${post.author?.color || 'green'}`} style={{ width: '24px', height: '24px', fontSize: '0.68rem' }}>
                            {post.author?.avatarUrl?.startsWith?.('http') ? <img src={post.author?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (post.author?.avatarUrl || post.author?.username?.charAt(0).toUpperCase())}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>
                            @{post.author?.handle}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--danger)" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            {post.likes?.length || 0}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {post.reelComments?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Reels or Visual Media Cards
                const isFeatured = (activeFilter === 'all') && idx % 7 === 0 && displayPosts.length > 4 && !isVideo

                const handleCardClick = () => {
                  if (isVideo) {
                    router.push(`/reels?id=${post.id}`)
                  } else {
                    openPostModal(post)
                  }
                }

                return (
                  <div
                    key={post.id}
                    onClick={handleCardClick}
                    style={{
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      // Fashionable portrait rectangle (9:16) for reels, square for photos
                      aspectRatio: isVideo ? '9 / 16' : '1',
                      gridColumn: isFeatured ? 'span 2' : 'span 1',
                      gridRow: isFeatured ? 'span 2' : 'span 1',
                      border: '1px solid var(--line)',
                      background: '#040a14',
                      boxShadow: 'var(--shadow)',
                      cursor: 'pointer',
                      transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, box-shadow 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.zIndex = '5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.zIndex = '1'
                    }}
                  >
                    {/* Media Thumbnail Rendering with Frame Grab */}
                    {isVideo ? (
                      <video
                        src={safeMediaUrl.includes('#') ? safeMediaUrl : `${safeMediaUrl}#t=0.5`}
                        poster={safeMediaUrl.includes('#') ? safeMediaUrl : `${safeMediaUrl}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => {
                          const v = e.target as HTMLVideoElement
                          v.pause()
                          v.currentTime = 0.5
                        }}
                      />
                    ) : safeMediaUrl ? (
                      <img
                        src={safeMediaUrl}
                        alt="Transmission Media"
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className={`post-media ${getMediaClass(post.mediaType)}`}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}

                    {/* Sector Badge Top Left */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: 'rgba(7, 17, 31, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid var(--line)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--earth)',
                      textTransform: 'uppercase',
                      zIndex: 10
                    }}>
                      {post.channel || 'earth'}
                    </div>

                    {/* Type Badge Top Right */}
                    {isVideo && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 8px',
                        borderRadius: '100px',
                        background: 'rgba(7, 17, 31, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        zIndex: 10
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <span>Reel</span>
                      </div>
                    )}

                    {isCarousel && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 8px',
                        borderRadius: '100px',
                        background: 'rgba(7, 17, 31, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        zIndex: 10
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Carousel</span>
                      </div>
                    )}

                    {/* Editorial Overlay */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 45%, rgba(4, 10, 20, 0.95) 90%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '16px',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div className={`user-avatar ${post.author?.color || 'green'}`} style={{ width: '26px', height: '26px', fontSize: '0.72rem' }}>
                          {post.author?.avatarUrl?.startsWith?.('http') ? <img src={post.author?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (post.author?.avatarUrl || post.author?.username?.charAt(0).toUpperCase())}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                          @{post.author?.handle}
                        </span>
                      </div>

                      {post.content && (
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          margin: '0 0 6px 0'
                        }}>
                          {post.content}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--danger)" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {post.likes?.length || 0}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {post.reelComments?.length || 0} notes
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── Full Instagram-Style Post Detail Modal ───────── */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(3, 8, 18, 0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              background: '#07111f',
              border: '1px solid var(--line)',
              borderRadius: '26px',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Modal Left: Media */}
            <div style={{
              position: 'relative',
              background: '#02060e',
              minHeight: '340px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedPost.mediaUrl ? (
                <img
                  src={selectedPost.mediaUrl}
                  alt="Modal Media"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '550px' }}
                />
              ) : (
                <div
                  className={`post-media ${getMediaClass(selectedPost.mediaType)}`}
                  style={{ width: '100%', height: '100%', minHeight: '340px' }}
                />
              )}
            </div>

            {/* Modal Right: Details & Discussion */}
            <div style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxHeight: '550px',
              overflowY: 'auto'
            }}>
              <div>
                {/* Header: Author Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`user-avatar ${selectedPost.author?.color || 'green'}`} style={{ width: '40px', height: '40px', fontSize: '0.95rem' }}>
                      {selectedPost.author?.avatarUrl?.startsWith?.('http') ? <img src={selectedPost.author?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (selectedPost.author?.avatarUrl || selectedPost.author?.username?.charAt(0).toUpperCase())}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedPost.author?.username}</div>
                      <div style={{ color: 'var(--earth)', fontSize: '0.78rem' }}>@{selectedPost.author?.handle}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: 'var(--muted)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <p style={{ fontSize: '0.94rem', lineHeight: 1.55, color: '#f3f7fb', marginBottom: '20px' }}>
                  {selectedPost.content}
                </p>

                {/* Sector Information */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '100px' }}>
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Localized Notes on Reel */}
                {selectedPost.reelComments?.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Localized Notes ({selectedPost.reelComments.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      {selectedPost.reelComments.map((c: any) => (
                        <div key={c.id} style={{ padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--earth)', fontWeight: 600 }}>@{c.user?.handle || 'astronaut'}: </span>
                          <span>{c.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={handleModalLike}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: selectedPostLiked ? 'rgba(255, 107, 122, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid',
                    borderColor: selectedPostLiked ? 'var(--danger)' : 'var(--line)',
                    color: selectedPostLiked ? 'var(--danger)' : 'var(--text)',
                    padding: '8px 16px',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {selectedPostLiked ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--danger)" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    )}
                  </span>
                  <span>{selectedPostLikesCount} Likes</span>
                </button>

                <Link
                  href="/reels"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '100px',
                    background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                    color: '#07111f',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>View in Reels Mode</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}







