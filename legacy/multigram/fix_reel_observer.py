import re

with open('src/components/ReelViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove handleScroll completely from the reel-container
content = re.sub(r'onScroll=\{handleScroll\}', '', content)
content = re.sub(r'const handleScroll =.*?setActiveIdx\(idx\);\n  \};', '', content, flags=re.DOTALL)

# Add IntersectionObserver to VideoPlayer
# Wait, VideoPlayer already uses isActive. But if we let VideoPlayer observe ITSELF...
# That is much more robust!
video_player_regex = re.compile(r'function VideoPlayer.*?return \(.*?</div>\s*\);\s*\}', re.DOTALL)

new_video_player = '''function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }} onClick={togglePlay}>
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
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
    </div>
  );
}'''

content = video_player_regex.sub(new_video_player, content)

# Remove isActive={idx === activeIdx}
content = re.sub(r'isActive=\{idx === activeIdx\}', '', content)

with open('src/components/ReelViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
