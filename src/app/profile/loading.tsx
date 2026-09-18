export default function ProfileLoading() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 16px 90px' }}>
      {/* Profile Header Skeleton */}
      <div style={{
        background: 'var(--panel)',
        borderRadius: '24px',
        border: '1px solid var(--line)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Avatar */}
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: 'rgba(28, 25, 20, 0.08)',
          border: '3px solid rgba(197, 160, 89, 0.3)',
          animation: 'orbitPulse 1.4s ease-in-out infinite'
        }} />

        {/* Names */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '160px',
            height: '24px',
            borderRadius: '6px',
            background: 'rgba(28, 25, 20, 0.08)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
          <div style={{
            width: '100px',
            height: '14px',
            borderRadius: '4px',
            background: 'rgba(28, 25, 20, 0.05)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '28px', marginTop: '8px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '40px',
                height: '18px',
                borderRadius: '4px',
                background: 'rgba(28, 25, 20, 0.08)',
                animation: 'orbitPulse 1.4s ease-in-out infinite'
              }} />
              <div style={{
                width: '60px',
                height: '10px',
                borderRadius: '4px',
                background: 'rgba(28, 25, 20, 0.04)',
                animation: 'orbitPulse 1.4s ease-in-out infinite'
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            width: '90px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(28, 25, 20, 0.06)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
        ))}
      </div>

      {/* Grid of posts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px'
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{
            aspectRatio: '1',
            borderRadius: '14px',
            background: 'rgba(28, 25, 20, 0.05)',
            border: '1px solid var(--line)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
        ))}
      </div>
    </div>
  );
}
