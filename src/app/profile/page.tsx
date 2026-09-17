import React from 'react';
import prisma from '../../lib/prisma';
import { getCurrentUser, logoutUser } from '../actions';
import { redirect } from 'next/navigation';
import ProfileView from '../../components/ProfileView';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    redirect('/auth/login?returnUrl=/profile');
  }

  let user: any = null;
  let savedPosts: any[] = [];

  try {
    const [fetchedUser, fetchedSaved] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUser.id },
        include: {
          posts: {
            orderBy: { createdAt: 'desc' }
          },
          followers: {
            include: { follower: true }
          },
          following: {
            include: { following: true }
          }
        }
      }),
      prisma.savedPost.findMany({
        where: { userId: currentUser.id },
        include: {
          post: {
            include: {
              author: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    user = fetchedUser;
    savedPosts = fetchedSaved;
  } catch (err: any) {
    console.error('Failed to load user profile:', err);
  }

  if (!user) {
    user = {
      id: currentUser.id,
      username: currentUser.username,
      handle: currentUser.handle,
      email: currentUser.email,
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
    <ProfileView
      user={user}
      currentUserId={currentUser.id}
      savedPosts={savedPosts}
      onLogout={handleLogout}
    />
  );
}

