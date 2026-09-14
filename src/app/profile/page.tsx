import React from 'react';
import prisma from '../../lib/prisma';
import { getCurrentUser, logoutUser } from '../actions';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    redirect('/auth/register');
  }

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' }
        },
        followers: true,
        following: true
      }
    });
  } catch (err: any) {
    console.error('Failed to load user profile:', err);
  }

  if (!user) {
    user = {
      id: currentUser.id,
      username: currentUser.username,
      handle: currentUser.handle,
      color: currentUser.color || 'green',
      location: currentUser.location || 'Deep Space',
      posts: [],
      followers: [],
      following: [],
    };
  }

  async function handleLogout() {
    'use server';
    await logoutUser();
    redirect('/auth/login');
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className={`profile-avatar user-avatar ${user.color || 'green'}`}>
          {user.avatarUrl || user.username.charAt(0).toUpperCase()}
        </div>
        
        <div className="profile-info" style={{ flex: 1 }}>
          <h1>{user.username}</h1>
          <div className="profile-handle">@{user.handle}</div>
          {user.location && (
            <div className="profile-location">📍 {user.location}</div>
          )}
        </div>

        <div>
          <form action={handleLogout}>
            <button type="submit" className="btn-danger">
              Logout
            </button>
          </form>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{user.posts?.length || 0}</span>
          <span className="profile-stat-label">Transmissions</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{user.followers?.length || 0}</span>
          <span className="profile-stat-label">Followers</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{user.following?.length || 0}</span>
          <span className="profile-stat-label">Following</span>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.3rem', marginBottom: '16px' }}>
        Transmitted Signals
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {user.posts?.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--panel)',
            borderRadius: '18px',
            border: '1px solid var(--line)',
            color: 'var(--muted)'
          }}>
            No transmissions recorded.
          </div>
        ) : (
          user.posts?.map(post => (
            <div key={post.id} className="post" style={{ padding: '20px', marginBottom: 0 }}>
              <p style={{ color: 'var(--text)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                {post.content}
              </p>
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                {post.mediaType && <span style={{ color: 'var(--earth)' }}>Sector: {post.mediaType}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
