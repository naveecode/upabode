import prisma from '../../lib/prisma';
import { getCurrentUser } from '../actions';
import ReelViewer from '../../components/ReelViewer';

export default async function ReelsPage() {
  const currentUser = await getCurrentUser();
  let posts: any[] = [];

  try {
    posts = await prisma.post.findMany({
      include: {
        author: {
          include: {
            followers: true,
          },
        },
        likes: true,
        savedBy: true,
        reelComments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                handle: true,
                avatarUrl: true,
                color: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (err: any) {
    console.error('Failed to load reels:', err);
  }

  return <ReelViewer posts={posts} currentUser={currentUser} />;
}
