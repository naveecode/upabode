import prisma from '../../lib/prisma';
import { getCurrentUser, markNotificationsRead } from '../actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/auth/login');
  }

  let notifications: any[] = [];
  try {
    notifications = await prisma.notification.findMany({
      where: { userId: currentUser.id },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            handle: true,
            avatarUrl: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } catch (err: any) {
    console.error('Failed to load notifications:', err);
  }

  async function handleMarkRead() {
    'use server';
    await markNotificationsRead();
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return '♥';
      case 'follow': return '✓';
      case 'comment': return '💬';
      case 'save': return '🔖';
      default: return '✦';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'like': return 'var(--danger)';
      case 'follow': return 'var(--earth)';
      case 'comment': return 'var(--yellow)';
      case 'save': return 'var(--earth)';
      default: return 'var(--text)';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '30px 20px 90px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ color: 'var(--earth)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Quantum Relay Network
          </div>
          <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
            Notifications
          </h1>
        </div>

        {unreadCount > 0 && (
          <form action={handleMarkRead}>
            <button
              type="submit"
              style={{
                padding: '7px 16px',
                borderRadius: '100px',
                background: 'rgba(64, 201, 162, 0.12)',
                border: '1px solid var(--earth)',
                color: 'var(--earth)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: '50px 20px',
            textAlign: 'center',
            background: 'var(--panel)',
            border: '1px dashed var(--line)',
            borderRadius: '20px',
            color: 'var(--muted)'
          }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🔔</span>
            <h3 style={{ color: 'var(--text)', marginBottom: '4px' }}>All Quiet on Cosmic Frequencies</h3>
            <p style={{ fontSize: '0.85rem' }}>You will receive real-time signals when astronauts like, follow, save, or comment on your transmissions.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 18px',
                borderRadius: '18px',
                background: n.read ? 'rgba(255, 255, 255, 0.03)' : 'rgba(64, 201, 162, 0.08)',
                border: '1px solid',
                borderColor: n.read ? 'var(--line)' : 'rgba(64, 201, 162, 0.3)',
                transition: '0.15s ease'
              }}
            >
              {/* Type badge icon */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(7, 17, 31, 0.8)',
                border: '1px solid var(--line)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.1rem',
                color: getIconColor(n.type),
                flexShrink: 0
              }}>
                {getIcon(n.type)}
              </div>

              {/* Actor Avatar */}
              {n.from && (
                <div className={`user-avatar ${n.from.color || 'green'}`} style={{ width: '36px', height: '36px', fontSize: '0.85rem', flexShrink: 0 }}>
                  {n.from.avatarUrl || n.from.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Message Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.4 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '3px' }}>
                  {new Date(n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>

              {/* Action Link */}
              {n.postId ? (
                <Link
                  href="/explore"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--earth)',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--line)',
                    flexShrink: 0
                  }}
                >
                  View ↗
                </Link>
              ) : (
                <Link
                  href="/chat"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--earth)',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--line)',
                    flexShrink: 0
                  }}
                >
                  Signal 💬
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
