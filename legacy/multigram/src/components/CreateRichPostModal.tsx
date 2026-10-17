'use client'

import { useState, useRef } from 'react'
import { createPost } from '../app/actions'
import { showToast } from './Toast'
import { useMentionAutocomplete, MentionDropdown } from './MentionSuggestions'

const FONT_PRESETS = [
  { id: 'sans', name: 'Modern Sans', style: 'var(--font-body), sans-serif' },
  { id: 'serif', name: 'Editorial Serif', style: 'var(--font-heading), Georgia, serif' },
  { id: 'space', name: 'Space Grotesk', style: 'var(--font-space-grotesk), monospace' },
  { id: 'mono', name: 'Cyber Mono', style: 'monospace' },
]

const ATMOSPHERE_THEMES = [
  { id: 'minimal', name: 'Clean Light', bg: 'var(--panel-solid)', color: 'var(--text)', border: 'var(--line)' },
  { id: 'gold', name: 'Luxury Gold', bg: 'linear-gradient(145deg, #1C1914, #2A241C)', color: '#F3F0E9', border: '#C5A059' },
  { id: 'void', name: 'Cosmic Void', bg: 'linear-gradient(145deg, #07111F, #0D1C2E)', color: '#F3F7FB', border: 'rgba(64, 201, 162, 0.4)' },
  { id: 'emerald', name: 'Emerald Deep', bg: 'linear-gradient(145deg, #0C211E, #14352F)', color: '#E2F3EE', border: '#40C9A2' },
  { id: 'nebula', name: 'Nebula Purple', bg: 'linear-gradient(145deg, #1F1128, #2B1838)', color: '#F8EEFC', border: '#B85C5C' },
]

const FOLDER_PRESETS = ['General', 'Research', 'Logs', 'Ideas', 'Personal']

export default function CreateRichPostModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('')
  const [selectedFont, setSelectedFont] = useState(FONT_PRESETS[0])
  const [selectedTheme, setSelectedTheme] = useState(ATMOSPHERE_THEMES[0])
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'title'>('normal')
  const [folder, setFolder] = useState('General')
  const [customFolder, setCustomFolder] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mention = useMentionAutocomplete({
    text: content,
    setText: setContent,
    inputRef: textareaRef
  })

  const handlePublish = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      showToast('Text post cannot be empty')
      return
    }

    const assignedFolder = (customFolder.trim() || folder.trim() || 'General')

    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('content', trimmed)
      // Store font, theme styling & folder organization in visualFilter & mediaType
      fd.append('mediaType', 'thread')
      fd.append('visualFilter', JSON.stringify({
        font: selectedFont.id,
        theme: selectedTheme.id,
        size: fontSize,
        folder: assignedFolder
      }))
      
      const res = await createPost(fd)
      if (res && (res as any).error) {
        showToast((res as any).error)
      } else {
        showToast('Text signal transmitted!')
        onClose()
        window.location.reload()
      }
    } catch (e: any) {
      showToast('Error transmitting text signal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFontSizeStyle = () => {
    if (fontSize === 'title') return '1.35rem'
    if (fontSize === 'large') return '1.1rem'
    return '0.96rem'
  }

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--panel)',
          width: '100%',
          maxWidth: '560px',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--line)',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-space-grotesk)', fontWeight: 700 }}>
              Compose Text Signal
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Stylized text post with recursive nested discussion
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Card Preview */}
        <div style={{
          position: 'relative',
          background: selectedTheme.bg,
          color: selectedTheme.color,
          border: `1.5px solid ${selectedTheme.border}`,
          borderRadius: '16px',
          padding: '20px',
          minHeight: '160px',
          marginBottom: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease'
        }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={mention.handleKeyDown}
            placeholder="Write your signal here... Express ideas, insights, or questions for the community to branch into discussions. (type @ to mention)"
            style={{
              width: '100%',
              minHeight: '130px',
              background: 'transparent',
              color: selectedTheme.color,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: selectedFont.style,
              fontSize: getFontSizeStyle(),
              lineHeight: 1.6
            }}
          />

          {mention.isOpen && (
            <MentionDropdown
              users={mention.users}
              selectedIndex={mention.selectedIndex}
              onSelect={mention.selectUser}
              isLoading={mention.isLoading}
            />
          )}
        </div>

        {/* Styling Controls Toolbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {/* Typography Presets */}
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 }}>
              Typography
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {FONT_PRESETS.map(font => (
                <button
                  key={font.id}
                  onClick={() => setSelectedFont(font)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    background: selectedFont.id === font.id ? 'var(--earth)' : 'var(--panel-solid)',
                    color: selectedFont.id === font.id ? '#07111f' : 'var(--text)',
                    border: '1px solid var(--line)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: '0.2s'
                  }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Atmosphere Theme Presets */}
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 }}>
              Atmosphere Theme
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {ATMOSPHERE_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    background: theme.bg,
                    color: theme.color,
                    border: selectedTheme.id === theme.id ? `2px solid var(--earth)` : `1px solid ${theme.border}`,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: selectedTheme.id === theme.id ? '0 0 10px rgba(197, 160, 89, 0.4)' : 'none'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.border }} />
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font Sizing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Text Scale:
            </span>
            {(['normal', 'large', 'title'] as const).map(size => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '100px',
                  background: fontSize === size ? 'var(--earth)' : 'var(--panel-solid)',
                  color: fontSize === size ? '#07111f' : 'var(--muted)',
                  border: '1px solid var(--line)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Folder Organization */}
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 }}>
              Dossier Folder
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {FOLDER_PRESETS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFolder(f); setCustomFolder('') }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '100px',
                    background: folder === f && !customFolder ? 'rgba(64, 201, 162, 0.2)' : 'var(--panel-solid)',
                    color: folder === f && !customFolder ? 'var(--earth)' : 'var(--muted)',
                    border: folder === f && !customFolder ? '1px solid var(--earth)' : '1px solid var(--line)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  📁 {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or custom folder name (e.g. Science, Philosophy)..."
              value={customFolder}
              onChange={e => setCustomFolder(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '100px',
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isSubmitting || !content.trim()}
            style={{
              padding: '10px 28px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
              color: '#07111f',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 18px rgba(197, 160, 89, 0.35)'
            }}
          >
            {isSubmitting ? 'Transmitting...' : 'Transmit Signal'}
          </button>
        </div>
      </div>
    </div>
  )
}
