export default function FeedLoading() {
  return (
    <main className="main-layout" style={{ opacity: 0.95 }}>
      <section className="feed" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Stories Tray Skeleton */}
        <div style={{
          display: 'flex',
          gap: '14px',
          padding: '14px 16px',
          background: 'var(--panel)',
          borderRadius: '18px',
          border: '1px solid var(--line)',
          overflow: 'hidden'
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '60px' }}>
              <div style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: 'rgba(28, 25, 20, 0.08)',
                animation: 'orbitPulse 1.4s ease-in-out infinite',
                border: '2px solid rgba(197, 160, 89, 0.25)',
              }} />
              <div style={{
                width: '42px',
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(28, 25, 20, 0.08)',
                animation: 'orbitPulse 1.4s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>

        {/* Create Post Box Skeleton */}
        <div style={{
          padding: '18px',
          background: 'var(--panel)',
          borderRadius: '20px',
          border: '1px solid var(--line)',
          display: 'flex',
          gap: '14px',
          alignItems: 'center'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(28, 25, 20, 0.08)',
            animation: 'orbitPulse 1.4s ease-in-out infinite',
          }} />
          <div style={{
            flex: 1,
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(28, 25, 20, 0.06)',
            animation: 'orbitPulse 1.4s ease-in-out infinite',
          }} />
        </div>

        {/* Post Card Skeleton 1 */}
        {[1, 2].map((i) => (
          <div key={i} style={{
            background: 'var(--panel)',
            borderRadius: '22px',
            border: '1px solid var(--line)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(28, 25, 20, 0.08)',
                animation: 'orbitPulse 1.4s ease-in-out infinite',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div style={{
                  width: '120px',
                  height: '12px',
                  borderRadius: '6px',
                  background: 'rgba(28, 25, 20, 0.08)',
                  animation: 'orbitPulse 1.4s ease-in-out infinite',
                }} />
                <div style={{
                  width: '80px',
                  height: '10px',
                  borderRadius: '5px',
                  background: 'rgba(28, 25, 20, 0.05)',
                  animation: 'orbitPulse 1.4s ease-in-out infinite',
                }} />
              </div>
            </div>

            <div style={{
              width: '90%',
              height: '14px',
              borderRadius: '7px',
              background: 'rgba(28, 25, 20, 0.07)',
              animation: 'orbitPulse 1.4s ease-in-out infinite',
            }} />
            <div style={{
              width: '70%',
              height: '14px',
              borderRadius: '7px',
              background: 'rgba(28, 25, 20, 0.06)',
              animation: 'orbitPulse 1.4s ease-in-out infinite',
            }} />

            {/* Media Area */}
            <div style={{
              width: '100%',
              height: '240px',
              borderRadius: '16px',
              background: 'rgba(28, 25, 20, 0.06)',
              animation: 'orbitPulse 1.4s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '2rem', opacity: 0.2 }}>🪐</span>
            </div>
          </div>
        ))}
      </section>

      {/* Right Panel Skeleton */}
      <aside className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          padding: '24px',
          background: 'var(--panel)',
          borderRadius: '22px',
          border: '1px solid var(--line)',
          height: '280px',
          animation: 'orbitPulse 1.4s ease-in-out infinite',
        }} />
      </aside>
    </main>
  );
}
