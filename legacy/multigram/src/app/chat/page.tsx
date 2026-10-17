import { getCurrentUser } from '../actions'
import { prisma } from '../../lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewChatSearch from '../../components/NewChatSearch'

export const dynamic = 'force-dynamic'

export default async function ChatInbox() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }

  let chats: any[] = [];
  try {
    chats = await prisma.chat.findMany({
      where: {
        users: {
          some: { id: user.id }
        }
      },
      include: {
        users: {
          select: { id: true, username: true, handle: true, avatarUrl: true, color: true, lastSeen: true }
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  } catch (err: any) {
    console.error('Failed to load chats:', err);
  }

  return (
    <div style={{
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '16px 14px 90px',
      minHeight: 'calc(100vh - 76px)'
    }}>
      <div className="chat-layout-grid" style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '24px',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        minHeight: 'calc(100vh - 140px)',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Left Pane: Channels & Search */}
        <div style={{
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          background: 'var(--panel-solid)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                Signals Inbox
              </h1>
              <span style={{
                background: 'rgba(64, 201, 162, 0.15)',
                color: 'var(--earth)',
                padding: '3px 10px',
                borderRadius: '100px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                {chats.length} active
              </span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '14px' }}>
              Low-latency WebSockets & Peer-to-Peer channels.
            </p>
            <NewChatSearch />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chats.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--muted)',
                borderRadius: '18px',
                border: '1px dashed var(--line)',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                    <path d="M2 12h20"/>
                  </svg>
                </div>
                No transmissions found.<br />Search an astronaut handle above to establish a link.
              </div>
            ) : (
              chats.map(chat => {
                const otherUser = chat.users.find((u: any) => u.id !== user.id) || chat.users[0] || { username: 'Astronaut', handle: 'cosmic', color: 'green', avatarUrl: null }
                const lastMessage = chat.messages[0]
                
                const isRecentlyActive = otherUser?.lastSeen && (Date.now() - new Date(otherUser.lastSeen).getTime()) < 5 * 60 * 1000
                
                return (
                  <a
                    href={`/chat/${chat.id}`}
                    key={chat.id}
                    className="chat-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      border: '1px solid transparent',
                      background: 'rgba(255, 255, 255, 0.03)',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: '0.2s ease'
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div className={`chat-item-avatar user-avatar ${otherUser?.color || 'green'}`} style={{ width: '42px', height: '42px', fontSize: '0.95rem' }}>
                        {otherUser?.avatarUrl?.startsWith?.('http') ? <img src={otherUser?.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (otherUser?.avatarUrl || otherUser?.username?.charAt(0).toUpperCase() || '✦')}
                      </div>
                      {isRecentlyActive && (
                        <span style={{
                          position: 'absolute',
                          bottom: '1px',
                          right: '1px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#40c9a2',
                          border: '2px solid var(--panel-solid)',
                          boxShadow: '0 0 6px rgba(64, 201, 162, 0.7)'
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{otherUser?.username || 'Astronaut'}</span>
                        {lastMessage && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }} suppressHydrationWarning>
                            {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--earth)', fontSize: '0.74rem', marginBottom: '2px' }}>
                        @{otherUser?.handle}
                      </div>
                      {lastMessage && (
                        <div style={{
                          color: 'var(--muted)',
                          fontSize: '0.76rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {lastMessage.content || (lastMessage.mediaUrl ? 'Image transmission' : lastMessage.voiceUrl ? 'Voice log' : '')}
                        </div>
                      )}
                    </div>
                  </a>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane: Standby / Welcome Screen for Desktop Only */}
        <div className="chat-inbox-preview-desktop" style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          textAlign: 'center',
          background: 'transparent'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(64, 201, 162, 0.2) 0%, transparent 70%)',
            border: '1px solid var(--line)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: '20px',
            boxShadow: '0 0 30px rgba(64, 201, 162, 0.2)'
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.4rem', marginBottom: '8px' }}>
            Encrypted Quantum Relays
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: '360px', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '24px' }}>
            Select any transmission channel from the left panel or initiate a new connection to broadcast messages, share media, or start a live P2P video call.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--earth)', background: 'rgba(64, 201, 162, 0.1)', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(64, 201, 162, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Real-time WebSockets
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--mars)', background: 'rgba(237, 118, 86, 0.1)', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(237, 118, 86, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              Free P2P WebRTC
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
