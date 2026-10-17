import prisma from '../../lib/prisma';
import { getCurrentUser } from '../actions';
import { redirect } from 'next/navigation';
import ReelViewer from '../../components/ReelViewer';

export const dynamic = 'force-dynamic';

export default async function ReelsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; post?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const params = await searchParams;
  const targetId = params?.id || params?.post;
  const returnUrl = targetId ? `/reels?id=${targetId}` : '/reels';

  if (!currentUser) {
    redirect(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  let posts: any[] = [];

  try {
    // Highly-optimized Prisma query targeting only video/reel media
    posts = await prisma.post.findMany({
      where: {
        archived: false,
        OR: [
          { mediaType: 'reel' },
          { mediaType: 'video' },
          { mediaUrl: { contains: '.mp4' } },
          { mediaUrl: { contains: '.webm' } },
          { mediaUrl: { contains: '.mov' } },
        ],
      },
      take: 40,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            handle: true,
            avatarUrl: true,
            color: true,
            followers: true,
          },
        },
        likes: true,
        savedBy: true,
        reelComments: {
          include: {
            user: { select: { id: true, username: true, handle: true, avatarUrl: true, color: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Clean out multi-image carousels if any matched
    posts = posts.filter(
      (p) =>
        p.mediaUrl &&
        !p.mediaUrl.includes(',') &&
        (p.mediaType === 'reel' || p.mediaType === 'video' || p.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i))
    );

    // If targetId was requested specifically (e.g. from deep link or explore) and is not in the latest 40, fetch it directly
    if (targetId && !posts.some((p) => p.id === targetId)) {
      const targetedPost = await prisma.post.findUnique({
        where: { id: targetId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              handle: true,
              avatarUrl: true,
              color: true,
              followers: true,
            },
          },
          likes: true,
          savedBy: true,
          reelComments: {
            include: {
              user: { select: { id: true, username: true, handle: true, avatarUrl: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (targetedPost) {
        posts.unshift(targetedPost);
      }
    }
  } catch (err: any) {
    console.error('Failed to load reels:', err);
  }

  return <ReelViewer posts={posts} currentUser={currentUser} initialTargetId={targetId} />;
}
