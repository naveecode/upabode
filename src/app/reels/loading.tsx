export default function ReelsLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: '#000',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(197, 160, 89, 0.12) 0%, rgba(5, 10, 18, 0.98) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(197, 160, 89, 0.15)',
            border: '1.5px solid rgba(197, 160, 89, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        >
          <img src="/icon.png" alt="Upabode" width={40} height={40} style={{ borderRadius: '50%' }} />
        </div>
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Loading Reels...
        </span>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 25px rgba(197, 160, 89, 0.4); }
        }
      `}</style>
    </div>
  );
}
