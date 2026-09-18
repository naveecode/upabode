export default function ExploreLoading() {
  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 20px 90px' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{
            width: '140px',
            height: '12px',
            borderRadius: '6px',
            background: 'rgba(197, 160, 89, 0.25)',
            marginBottom: '8px',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
          <div style={{
            width: '220px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(28, 25, 20, 0.08)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
        </div>
      </div>

      {/* Search Input Bar Skeleton */}
      <div style={{
        height: '48px',
        borderRadius: '16px',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        marginBottom: '24px',
        animation: 'orbitPulse 1.4s ease-in-out infinite'
      }} />

      {/* Filter Tabs Skeleton */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            width: '80px',
            height: '34px',
            borderRadius: '100px',
            background: 'rgba(28, 25, 20, 0.06)',
            animation: 'orbitPulse 1.4s ease-in-out infinite'
          }} />
        ))}
      </div>

      {/* Mosaic Grid Skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
          const isLarge = i % 5 === 0;
          return (
            <div
              key={i}
              style={{
                borderRadius: '16px',
                height: isLarge ? '320px' : '200px',
                gridRowEnd: isLarge ? 'span 2' : 'span 1',
                background: 'rgba(28, 25, 20, 0.06)',
                border: '1px solid var(--line)',
                animation: 'orbitPulse 1.4s ease-in-out infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '1.4rem', opacity: 0.2 }}>✨</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
