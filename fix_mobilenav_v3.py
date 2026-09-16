import re

with open('src/components/MobileNav.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the push behavior: only push on touch end, but animate on touch move
# We will use local state for the "visual index" to move the wave without routing!
new_code = '''
  const [touchX, setTouchX] = useState<number | null>(null)
  const [visualIndex, setVisualIndex] = useState(safeIndex)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setVisualIndex(safeIndex)
  }, [safeIndex])

  const handleTouchStart = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX)
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const width = window.innerWidth;
    const tabWidth = width / tabs.length;
    let newIndex = Math.floor(currentX / tabWidth);
    newIndex = Math.max(0, Math.min(newIndex, tabs.length - 1));
    setVisualIndex(newIndex);
  }

  const handleTouchEnd = () => {
    if (visualIndex !== safeIndex) {
       router.push(tabs[visualIndex].href);
    }
    setTouchX(null)
  }
'''
content = re.sub(r'const \[touchX, setTouchX\] = useState<number \| null>\(null\).*?const handleTouchEnd = \(\) => setTouchX\(null\)', new_code.strip(), content, flags=re.DOTALL)

# 2. Fix the CSS styles (remove yellow ball, fix wave)
css_replace = '''
        .tab-indicator {
          display: none;
        }
        
        /* The liquid wave SVG background behind the indicator */
        .tab-wave-bg {
          position: absolute;
          top: -24px;
          width: 120px;
          height: 24px;
          transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          z-index: 0;
        }
'''
content = re.sub(r'\.tab-indicator \{[\s\S]*?z-index: 0;\n        \}', css_replace.strip(), content, flags=re.DOTALL)

# 3. Update the wave transform to be perfectly centered, and only use wave cavity
svg_replace = r'<svg className="tab-wave-bg" viewBox="0 0 120 24" style={{ transform: 	ranslateX(calc(% + 10vw - 60px)) }}>'
content = re.sub(r'<svg className="tab-wave-bg" viewBox="0 0 120 24" style={{ transform: 	ranslateX\([^]+ \}\}>', svg_replace, content)

# 4. Remove the indicator div entirely
content = re.sub(r'<div className="tab-indicator".*?/>', '', content)

with open('src/components/MobileNav.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
