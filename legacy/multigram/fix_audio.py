import re

with open('src/components/Post.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_audio_player = '''function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!audioRef.current) return;
        if (entry.intersectionRatio > 0.6) {
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      });
    }, { threshold: [0.6] });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleAudio = (e: React.MouseEvent) => {
    if(e && e.stopPropagation) e.stopPropagation();
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 20 }}>
      <audio
        ref={audioRef}
        src={src}
        loop
        onPlay={(e) => {
          setIsPlaying(true);
          const target = e.target as HTMLAudioElement;
          document.querySelectorAll('video, audio').forEach(media => {
            if (media !== target) (media as HTMLMediaElement).pause();
          });
        }}
        onPause={() => setIsPlaying(false)}
      />
      <button
        onClick={toggleAudio}
        style={{
          width: '40px', height: '40px', borderRadius: '50%', background: isPlaying ? 'var(--earth)' : 'rgba(0,0,0,0.6)',
          border: '1px solid var(--earth)', color: isPlaying ? '#000' : 'var(--earth)', fontSize: '1.2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}
      >
        {isPlaying ? 'dY%?' : 'dY%?'}
      </button>
    </div>
  );
}'''

content = re.sub(r'function AudioPlayer.*?</button>\s*</div>\s*\);\s*\}', new_audio_player, content, flags=re.DOTALL)

with open('src/components/Post.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
