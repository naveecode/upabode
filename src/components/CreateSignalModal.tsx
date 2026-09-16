'use client'

import { useState } from 'react'
import { createPost } from '../app/actions'

export default function CreateSignalModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    const fd = new FormData()
    fd.append('content', content)
    // No media attached for text signals
    await createPost(fd)
    setIsSubmitting(false)
    window.location.reload()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--panel)', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid var(--line)'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Transmit Signal</h3>
        <textarea
          autoFocus
          placeholder="What's on your mind? Stylized text signals..."
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{
            width: '100%', minHeight: '150px', background: 'var(--panel-solid)', color: '#fff',
            border: '1px solid var(--line)', borderRadius: '12px', padding: '12px', fontSize: '1rem',
            resize: 'none', marginBottom: '16px', fontFamily: 'inherit'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '20px', background: 'transparent', border: 'none', color: 'var(--muted)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !content.trim()} style={{ padding: '8px 24px', borderRadius: '20px', background: 'var(--earth)', border: 'none', color: '#000', fontWeight: 'bold' }}>
            {isSubmitting ? 'Transmitting...' : 'Transmit'}
          </button>
        </div>
      </div>
    </div>
  )
}
