'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addThreadComment } from '../app/actions'
import { showToast } from './Toast'

interface CommentNode {
  id: string
  content: string
  createdAt: string | Date
  userId: string
  parentId?: string | null
  user: {
    id: string
    username: string
    handle: string
    avatarUrl?: string | null
    color?: string | null
  }
}

interface ThreadCommentItemProps {
  comment: CommentNode
  childrenMap: Map<string, CommentNode[]>
  postId: string
  currentUserId?: string
  depth: number
  onCommentAdded: (newComment: any) => void
}

function ThreadCommentItem({
  comment,
  childrenMap,
  postId,
  currentUserId,
  depth,
  onCommentAdded
}: ThreadCommentItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const replies = childrenMap.get(comment.id) || []

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) {
      showToast('Please login to reply')
      return
    }
    const trimmed = replyText.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      const res = await addThreadComment(postId, trimmed, comment.id)
      if (res.success && res.comment) {
        setReplyText('')
        setIsReplying(false)
        onCommentAdded(res.comment)
        showToast('Reply published')
      } else {
        showToast(res.error || 'Failed to reply')
      }
    } catch (err: any) {
      showToast('Error publishing reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const timeAgo = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr)
      const diff = Math.floor((Date.now() - d.getTime()) / 1000)
      if (diff < 60) return 'just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`
      return `${Math.floor(diff / 86400)}d`
    } catch {
      return ''
    }
  }

  return (
    <div className="thread-comment-node" style={{ position: 'relative', marginTop: depth === 0 ? '16px' : '10px' }}>
      {/* Connecting Vertical Guide Line for Replies */}
      {depth > 0 && (
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Click to collapse branch"
          style={{
            position: 'absolute',
            left: '-16px',
            top: '0px',
            bottom: '0px',
            width: '2px',
            background: isCollapsed ? 'var(--earth)' : 'rgba(197, 160, 89, 0.25)',
            cursor: 'pointer',
            transition: 'background 0.2s',
            borderRadius: '2px'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--earth)')}
          onMouseLeave={e => (e.currentTarget.style.background = isCollapsed ? 'var(--earth)' : 'rgba(197, 160, 89, 0.25)')}
        />
      )}

      {/* Comment Card */}
      <div style={{
        background: depth === 0 ? 'rgba(28, 25, 20, 0.03)' : 'transparent',
        borderRadius: '12px',
        padding: depth === 0 ? '10px 12px' : '4px 0',
        transition: '0.2s'
      }}>
        {/* Comment Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Link href={`/profile/${comment.user.handle}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <div 
              className={`user-avatar ${comment.user.color || 'green'}`} 
              style={{ width: '26px', height: '26px', fontSize: '0.72rem', flexShrink: 0 }}
            >
              {comment.user.avatarUrl?.startsWith('http') ? (
                <img src={comment.user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                comment.user.avatarUrl || comment.user.username?.charAt(0).toUpperCase() || '✦'
              )}
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>
              {comment.user.username}
            </span>
            <span style={{ color: 'var(--earth)', fontSize: '0.74rem' }}>
              @{comment.user.handle}
            </span>
          </Link>
          
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: 'auto' }}>
            {timeAgo(comment.createdAt)}
          </span>

          {replies.length > 0 && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
              title={isCollapsed ? 'Expand thread' : 'Collapse thread'}
            >
              {isCollapsed ? `[+${replies.length}]` : '[-]'}
            </button>
          )}
        </div>

        {/* Comment Text Content */}
        {!isCollapsed && (
          <>
            <div style={{
              fontSize: '0.88rem',
              lineHeight: 1.45,
              color: 'var(--text)',
              wordBreak: 'break-word',
              paddingLeft: '34px',
              marginBottom: '6px'
            }}>
              {comment.content}
            </div>

            {/* Comment Actions: Reply button */}
            <div style={{ paddingLeft: '34px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.74rem' }}>
              <button
                onClick={() => setIsReplying(!isReplying)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isReplying ? 'var(--earth)' : 'var(--muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'color 0.2s'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            </div>

            {/* Inline Reply Form */}
            {isReplying && (
              <form onSubmit={handlePostReply} style={{ paddingLeft: '34px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Reply to @${comment.user.handle}...`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '100px',
                      background: 'var(--panel-solid)',
                      border: '1px solid var(--earth)',
                      color: 'var(--text)',
                      fontSize: '16px', // Prevents mobile zoom
                      outline: 'none'
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyText.trim()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '100px',
                      background: 'var(--earth)',
                      color: '#07111f',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: isSubmitting ? 'wait' : 'pointer'
                    }}
                  >
                    {isSubmitting ? '...' : 'Reply'}
                  </button>
                </div>
              </form>
            )}

            {/* Recursive Nested Replies with branch guidelines */}
            {replies.length > 0 && (
              <div style={{ marginLeft: '18px', paddingLeft: '12px', borderLeft: '1.5px solid rgba(197, 160, 89, 0.2)' }}>
                {replies.map(child => (
                  <ThreadCommentItem
                    key={child.id}
                    comment={child}
                    childrenMap={childrenMap}
                    postId={postId}
                    currentUserId={currentUserId}
                    depth={depth + 1}
                    onCommentAdded={onCommentAdded}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ThreadCommentTree({
  comments,
  postId,
  currentUserId,
  onCommentAdded
}: {
  comments: any[]
  postId: string
  currentUserId?: string
  onCommentAdded: (newComment: any) => void
}) {
  const [rootCommentText, setRootCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Build tree from flat comments
  const childrenMap = new Map<string, CommentNode[]>()
  const rootComments: CommentNode[] = []

  comments.forEach(c => {
    if (c.parentId) {
      const existing = childrenMap.get(c.parentId) || []
      existing.push(c)
      childrenMap.set(c.parentId, existing)
    } else {
      rootComments.push(c)
    }
  })

  const handlePostRootComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) {
      showToast('Please login to contribute to thread')
      return
    }
    const trimmed = rootCommentText.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      const res = await addThreadComment(postId, trimmed)
      if (res.success && res.comment) {
        setRootCommentText('')
        onCommentAdded(res.comment)
        showToast('Comment published')
      } else {
        showToast(res.error || 'Failed to post comment')
      }
    } catch (err) {
      showToast('Error publishing comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="thread-comment-tree" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
      {/* Root Comment Form */}
      <form onSubmit={handlePostRootComment} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input
          type="text"
          value={rootCommentText}
          onChange={e => setRootCommentText(e.target.value)}
          placeholder="Contribute to this discussion branch..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '100px',
            background: 'var(--panel-solid)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            fontSize: '16px', // Prevents mobile zoom
            outline: 'none',
            transition: 'border 0.2s'
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--earth)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--line)')}
        />
        <button
          type="submit"
          disabled={isSubmitting || !rootCommentText.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: '100px',
            background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
            color: '#07111f',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: isSubmitting ? 'wait' : 'pointer',
            boxShadow: '0 2px 10px rgba(197, 160, 89, 0.25)'
          }}
        >
          {isSubmitting ? '...' : 'Reply'}
        </button>
      </form>

      {/* Discussion List */}
      {rootComments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)', fontSize: '0.82rem' }}>
          No replies yet. Start the thread!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rootComments.map(rootComment => (
            <ThreadCommentItem
              key={rootComment.id}
              comment={rootComment}
              childrenMap={childrenMap}
              postId={postId}
              currentUserId={currentUserId}
              depth={0}
              onCommentAdded={onCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  )
}
