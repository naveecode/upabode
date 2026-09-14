import prisma from '../../lib/prisma';
import Link from 'next/link';

export default async function ReelsPage() {
  const posts = await prisma.post.findMany({
    include: {
      author: true,
      likes: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora';
      case 'mars-landscape': return 'mars-landscape';
      case 'ocean': return 'ocean';
      default: return 'aurora';
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 76px - 66px)',
      padding: '20px 10px',
      position: 'relative'
    }}>
      {/* Centered Reels Phone Frame for Desktop & Edge-to-Edge for Mobile */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        height: 'calc(100vh - 120px)',
        minHeight: '560px',
        borderRadius: '28px',
        border: '1px solid var(--line)',
        background: '#030812',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        position: 'relative',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(64, 201, 162, 0.15)'
      }}>
        {posts.map((post, idx) => (
          <div
            key={post.id}
            style={{
              height: '100%',
              minHeight: '100%',
              scrollSnapAlign: 'start',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              overflow: 'hidden'
            }}
          >
            {/* Ambient Background Visualizer */}
            {post.mediaUrl ? (
              <img 
                src={post.mediaUrl} 
                alt="Reel Media" 
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div className={`post-media ${getMediaClass(post.mediaType)}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            )}

            {/* Dark Gradient Overlay for Typography Readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 40%, rgba(7, 17, 31, 0.95) 90%)',
              pointerEvents: 'none'
            }} />

            {/* Top Indicator */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <span style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(7, 17, 31, 0.6)',
                backdropFilter: 'blur(12px)',
                padding: '4px 12px',
                borderRadius: '100px',
                border: '1px solid var(--line)',
                color: 'var(--earth)'
              }}>
                Sector Reel #{idx + 1}
              </span>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--muted)',
                background: 'rgba(7, 17, 31, 0.6)',
                backdropFilter: 'blur(12px)',
                padding: '4px 10px',
                borderRadius: '100px',
                border: '1px solid var(--line)'
              }}>
                ● LIVE
              </span>
            </div>

            {/* Right Action Floating Column */}
            <div style={{
              position: 'absolute',
              right: '14px',
              bottom: '90px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              alignItems: 'center',
              zIndex: 15
            }}>
              <button style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(16, 34, 57, 0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.3rem',
                  transition: 'transform 0.15s ease'
                }}>
                  ♥
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{post.likes?.length || 0}</span>
              </button>

              <button style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(16, 34, 57, 0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.2rem'
                }}>
                  💬
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>0</span>
              </button>

              <button style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(16, 34, 57, 0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '1.2rem'
                }}>
                  ↗
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Relay</span>
              </button>

              <Link href={`/chat`} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                color: 'white'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#07111f',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(64, 201, 162, 0.4)'
                }}>
                  ＋
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Signal</span>
              </Link>
            </div>

            {/* Reel Content & Metadata Overlay */}
            <div style={{
              position: 'relative',
              zIndex: 10,
              padding: '20px',
              paddingRight: '74px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div className={`user-avatar ${post.author.color || 'green'}`} style={{ width: '38px', height: '38px', fontSize: '0.9rem', flexShrink: 0 }}>
                  {post.author.avatarUrl || post.author.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'white' }}>
                    {post.author.username}
                  </div>
                  <div style={{ color: 'var(--earth)', fontSize: '0.76rem' }}>
                    @{post.author.handle}
                  </div>
                </div>
              </div>

              <p style={{
                fontSize: '0.88rem',
                lineHeight: 1.45,
                color: '#eaf1f8',
                marginBottom: '12px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {post.content}
              </p>

              {/* Ambient Audio Synth Badge */}
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
                <span>Interplanetary Synth • {post.channel || 'Earth'} Relay 104.2 FM</span>
              </div>
            </div>
          </div>
        ))}

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
            <span style={{ fontSize: '3rem', marginBottom: '14px' }}>🪐</span>
            <h3 style={{ color: 'var(--text)', marginBottom: '6px' }}>No Cosmic Reels Yet</h3>
            <p style={{ fontSize: '0.85rem' }}>Broadcast the first reel transmission from the Home feed!</p>
          </div>
        )}
      </div>
    </div>
  );
}
