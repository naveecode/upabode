import prisma from '../../lib/prisma';
import { getCurrentUser } from '../actions';
import ReelViewer from '../../components/ReelViewer';

export default async function ReelsPage() {
  const currentUser = await getCurrentUser();
  let posts: any[] = [];

  try {
    posts = await prisma.post.findMany({
      where: { archived: false },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { include: { followers: true } },
        likes: true,
        savedBy: true,
        reelComments: {
          include: {
            user: { select: { id: true, username: true, handle: true, avatarUrl: true, color: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Filter out carousels and keep only videos/reels
    posts = posts.filter(p => p.mediaUrl && !p.mediaUrl.includes(',') && (p.mediaType === 'reel' || p.mediaType === 'video' || p.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i)));
  } catch (err: any) {
    console.error('Failed to load reels:', err);
  }

  return <ReelViewer posts={posts} currentUser={currentUser} />;
}
