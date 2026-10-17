import re

with open('src/components/ReelViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

video_player_regex = re.compile(r'function VideoPlayer.*?return \(.*?</div>\s*\);\s*\}', re.DOTALL)

new_video_player = '''function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showIndicator, setShowIndicator] = useState<'volume' | 'brightness' | null>(null);
  
  // Touch drag state
  const touchState = useRef({ startY: 0, startVal: 0, type: '' });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (videoRef.current) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              }
            }
          } else {
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => { if (videoRef.current) observer.disconnect(); };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const { clientX, clientY } = touch;
    const isLeft = clientX < window.innerWidth / 2;
    touchState.current = {
      startY: clientY,
      startVal: isLeft ? brightness : (videoRef.current?.volume || 1),
      type: isLeft ? 'brightness' : 'volume'
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current.type) return;
    const touch = e.touches[0];
    const diff = (touchState.current.startY - touch.clientY) * 0.01; // sensitivity
    let newVal = touchState.current.startVal + diff;
    newVal = Math.max(0, Math.min(newVal, 2)); // max brightness 2x, max volume 1
    
    if (touchState.current.type === 'brightness') {
      setBrightness(newVal);
      setShowIndicator('brightness');
    } else {
      newVal = Math.min(newVal, 1);
      if (videoRef.current) videoRef.current.volume = newVal;
      setVolume(newVal);
      setShowIndicator('volume');
    }
  };

  const handleTouchEnd = () => {
    touchState.current = { startY: 0, startVal: 0, type: '' };
    setTimeout(() => setShowIndicator(null), 1000);
  };

  return (
    <div 
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }} 
      onClick={togglePlay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        onPlay={(e) => {
          setIsPlaying(true);
          const target = e.target as HTMLVideoElement;
          document.querySelectorAll('video, audio').forEach(media => {
            if (media !== target) (media as HTMLMediaElement).pause();
          });
        }}
        onPause={() => setIsPlaying(false)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: rightness() }}
      />
      {!isPlaying && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
          backdropFilter: 'blur(4px)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      )}
      
      {showIndicator && (
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '20px',
          color: 'white', fontSize: '14px', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {showIndicator === 'brightness' ? 'Brightness: ' + Math.round(brightness * 50) + '%' : 'Volume: ' + Math.round(volume * 100) + '%'}
        </div>
      )}
    </div>
  );
}'''

content = video_player_regex.sub(new_video_player, content)
with open('src/components/ReelViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
