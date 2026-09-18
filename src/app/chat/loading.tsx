export default function ChatLoading() {
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
        boxShadow: 'var(--shadow)',
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 420px) 1fr',
      }}>
        {/* Left Pane Skeleton */}
        <div style={{
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          background: 'var(--panel-solid)',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '120px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(28, 25, 20, 0.08)',
              animation: 'orbitPulse 1.4s ease-in-out infinite'
            }} />
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(197, 160, 89, 0.2)',
              animation: 'orbitPulse 1.4s ease-in-out infinite'
            }} />
          </div>

          {/* Search bar placeholder */}
          <div style={{
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(28, 25, 20, 0.05)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />

          {/* Conversations list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '14px',
                background: 'rgba(28, 25, 20, 0.03)',
                border: '1px solid var(--line)',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(28, 25, 20, 0.08)',
                  animation: 'orbitPulse 1.4s ease-in-out infinite'
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    width: '100px',
                    height: '12px',
                    borderRadius: '4px',
                    background: 'rgba(28, 25, 20, 0.08)',
                    animation: 'orbitPulse 1.4s ease-in-out infinite'
                  }} />
                  <div style={{
                    width: '160px',
                    height: '10px',
                    borderRadius: '4px',
                    background: 'rgba(28, 25, 20, 0.04)',
                    animation: 'orbitPulse 1.4s ease-in-out infinite'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane Empty / Placeholder */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          color: 'var(--muted)',
          padding: '40px'
        }}>
          <span style={{ fontSize: '3rem', opacity: 0.2 }}>📡</span>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Selecting transmission relay...</p>
        </div>
      </div>
    </div>
  );
}
