import React from 'react';
import prisma from '../../../lib/prisma';
import { getCurrentUser } from '../../actions';
import ProfileView from '../../../components/ProfileView';
import { redirect } from 'next/navigation';

export default async function OtherUserProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = await params;
  const currentUser = await getCurrentUser();
  const handle = resolvedParams.handle;

  if (!currentUser) {
    redirect(`/auth/login?returnUrl=/profile/${encodeURIComponent(handle)}`);
  }

  if (currentUser && currentUser.handle === handle) {
    redirect('/profile');
  }

  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      posts: {
        where: { archived: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          likes: true,
          reelComments: { include: { user: true } },
          savedBy: true
        }
      },
      followers: { include: { follower: true } },
      following: { include: { following: true } },
    }
  });

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'white' }}>
        <h2>Astronaut Not Found</h2>
        <p style={{ color: 'var(--muted)' }}>This explorer does not exist in the quantum network.</p>
      </div>
    );
  }

  const publicSavedPosts = await prisma.savedPost.findMany({
    where: { userId: user.id, isPublic: true },
    include: {
      post: {
        include: {
          author: true,
          likes: true,
          reelComments: { include: { user: true } },
          savedBy: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <ProfileView 
      user={user} 
      savedPosts={publicSavedPosts} 
      currentUserId={currentUser?.id} 
    />
  );
}
