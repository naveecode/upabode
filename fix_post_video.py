import re

with open('src/components/Post.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

video_player_regex = re.compile(r'function VideoPlayer.*?return \(.*?</div>\s*\);\s*\}', re.DOTALL)

new_video_player = '''function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }} onClick={togglePlay}>
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
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
          backdropFilter: 'blur(4px)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      )}
    </div>
  );
}'''

content = video_player_regex.sub(new_video_player, content)

with open('src/components/Post.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
