import React from 'react';
import prisma from '../../lib/prisma';
import { getCurrentUser } from '../actions';
import ExploreSearch from '../../components/ExploreSearch';
import { redirect } from 'next/navigation';

export default async function ExplorePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/auth/login?returnUrl=/explore');
  }
  let users: any[] = [];
  let posts: any[] = [];

  try {
    const results = await Promise.all([
      prisma.user.findMany({
        include: {
          posts: true,
          followers: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 12,
      }),
      prisma.post.findMany({
        include: {
          author: true,
          likes: true,
          reelComments: {
            include: {
              user: true
            }
          },
          savedBy: true
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 48,
      }),
    ]);
    users = results[0].filter(u => !currentUser || u.id !== currentUser.id);
    posts = results[1];

    // Content Suggestion Algorithm:
    // score = (likes * 2) + (comments * 3) + recencyBoost
    const now = Date.now();
    posts.sort((a, b) => {
      const ageHoursA = Math.max(0, (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60));
      const ageHoursB = Math.max(0, (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60));

      const recencyBoostA = Math.max(0, 24 - ageHoursA) * 0.5;
      const recencyBoostB = Math.max(0, 24 - ageHoursB) * 0.5;

      const scoreA = (a.likes?.length || 0) * 2 + (a.reelComments?.length || 0) * 3 + recencyBoostA;
      const scoreB = (b.likes?.length || 0) * 2 + (b.reelComments?.length || 0) * 3 + recencyBoostB;

      return scoreB - scoreA;
    });

  } catch (err: any) {
    console.error('Failed to load explore data:', err);
  }

  return (
    <div style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', padding: '20px 14px 90px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ color: 'var(--earth)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Deep Space Visual Relay
          </div>
          <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.04em', margin: 0 }}>
            Explore Cosmos
          </h1>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Real-time algorithmic discovery across planetary sectors
        </span>
      </div>

      {/* Robust Search & Mosaic Grid */}
      <ExploreSearch
        initialUsers={users}
        initialPosts={posts}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}

