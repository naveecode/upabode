import React from 'react';
import prisma from '../../lib/prisma';
import Link from 'next/link';
import NewChatSearch from '../../components/NewChatSearch';

export default async function ExplorePage() {
  let users: any[] = [];
  let posts: any[] = [];

  try {
    const results = await Promise.all([
      prisma.user.findMany({
        include: {
          posts: true,
          followers: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
      }),
      prisma.post.findMany({
        include: {
          author: true,
          likes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 24,
      }),
    ]);
    users = results[0];
    posts = results[1];
  } catch (err: any) {
    console.error('Failed to load explore data:', err);
  }

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora';
      case 'mars-landscape': return 'mars-landscape';
      case 'ocean': return 'ocean';
      default: return 'aurora';
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '30px 20px 90px' }}>
      {/* Header & Global Search */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ color: 'var(--earth)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Deep Space Network
            </div>
            <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.04em' }}>
              Explore Cosmos
            </h1>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            {posts.length} transmissions mapped across 3 sectors
          </span>
        </div>

        <NewChatSearch />
      </div>

      {/* Featured Astronauts Horizontal Bar */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text)' }}>
          Active Explorers
        </h2>
        <div style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none'
        }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                minWidth: '180px',
                padding: '16px',
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: '20px',
                textAlign: 'center',
                flexShrink: 0,
                backdropFilter: 'blur(12px)',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
            >
              <div
                className={`user-avatar ${user.color || 'green'}`}
                style={{ width: '56px', height: '56px', margin: '0 auto 10px', fontSize: '1.3rem' }}
              >
                {user.avatarUrl || user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </div>
              <div style={{ color: 'var(--earth)', fontSize: '0.76rem', marginBottom: '8px' }}>
                @{user.handle}
              </div>
              <Link
                href="/chat"
                style={{
                  display: 'block',
                  padding: '6px 12px',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Connect
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Instagram-style Visual Discovery Grid */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.15rem', marginBottom: '16px', color: 'var(--text)' }}>
          Transmissions Mosaic
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                position: 'relative',
                borderRadius: '18px',
                overflow: 'hidden',
                aspectRatio: '1',
                border: '1px solid var(--line)',
                background: 'var(--panel-solid)',
                boxShadow: 'var(--shadow)',
                cursor: 'pointer'
              }}
            >
              {/* Media / Atmospheric Visual */}
              {post.mediaUrl ? (
                <img
                  src={post.mediaUrl}
                  alt="Explore Media"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className={`post-media ${getMediaClass(post.mediaType)}`}
                  style={{ width: '100%', height: '100%' }}
                />
              )}

              {/* Atmospheric Overlay with Content on Hover/Permanent */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(7, 17, 31, 0.95) 90%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div className={`user-avatar ${post.author.color || 'green'}`} style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                    {post.author.avatarUrl || post.author.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>
                    @{post.author.handle}
                  </span>
                </div>

                <p style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '6px'
                }}>
                  {post.content}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted)' }}>
                  <span>Sector: {post.channel || 'earth'}</span>
                  <span>♥ {post.likes?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
