'use server';

import { prisma } from '../lib/prisma';
import { getSession, setSession, clearSession } from '../lib/session';
import { pusherServer } from '../lib/pusher';

export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const handle = formData.get('handle') as string;
  const location = formData.get('location') as string;
  const color = formData.get('color') as string;

  if (!username || !handle) {
    return { error: 'Username and handle are required.' };
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { handle } });
    if (existingUser) {
      return { error: 'Handle is already taken.' };
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return { error: 'Username is already taken.' };
    }

    const user = await prisma.user.create({
      data: {
        username,
        handle,
        location: location || null,
        color: color || 'green',
        avatarUrl: username.substring(0, 2).toUpperCase(),
      },
    });

    await setSession(user.id);
    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Register error:', error);
    return { error: 'Failed to register user.' };
  }
}

export async function loginUser(formData: FormData) {
  const handle = formData.get('handle') as string;

  if (!handle) {
    return { error: 'Handle is required.' };
  }

  try {
    const user = await prisma.user.findUnique({ where: { handle } });
    if (!user) {
      return { error: 'User not found.' };
    }

    await setSession(user.id);
    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Failed to login.' };
  }
}

export async function logoutUser() {
  await clearSession();
  return { success: true };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function toggleLike(postId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        postId,
        userId: currentUser.id,
      },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return { success: true, liked: false };
    } else {
      await prisma.like.create({
        data: {
          postId,
          userId: currentUser.id,
        },
      });
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    return { error: 'Failed to toggle like.' };
  }
}

export async function toggleFollow(authorId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };
  if (currentUser.id === authorId) return { error: 'Cannot follow yourself.' };

  try {
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: currentUser.id,
        followingId: authorId,
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({ where: { id: existingFollow.id } });
      return { success: true, followed: false };
    } else {
      await prisma.follow.create({
        data: {
          followerId: currentUser.id,
          followingId: authorId,
        },
      });
      return { success: true, followed: true };
    }
  } catch (error) {
    console.error('Toggle follow error:', error);
    return { error: 'Failed to toggle follow.' };
  }
}

export async function sendMessage(chatId: string, content: string, mediaUrl?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const message = await prisma.message.create({
      data: {
        content,
        mediaUrl,
        chatId,
        senderId: currentUser.id,
      },
      include: {
        sender: true,
      },
    });

    await pusherServer.trigger(`chat-${chatId}`, 'new-message', message);
    return { success: true, message };
  } catch (error) {
    console.error('Send message error:', error);
    return { error: 'Failed to send message.' };
  }
}

export async function searchUsers(query: string) {
  const currentUser = await getCurrentUser();
  
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
        ],
        NOT: currentUser ? { id: currentUser.id } : undefined,
      },
      take: 20,
    });
    return { success: true, users };
  } catch (error) {
    console.error('Search users error:', error);
    return { error: 'Failed to search users.' };
  }
}

export async function startChat(otherUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { users: { some: { id: currentUser.id } } },
          { users: { some: { id: otherUserId } } },
        ],
      },
    });

    if (existingChat) {
      return { success: true, chatId: existingChat.id };
    }

    const newChat = await prisma.chat.create({
      data: {
        users: {
          connect: [{ id: currentUser.id }, { id: otherUserId }],
        },
      },
    });

    return { success: true, chatId: newChat.id };
  } catch (error) {
    console.error('Start chat error:', error);
    return { error: 'Failed to start chat.' };
  }
}

export async function createPost(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  const content = formData.get('content') as string;
  const mediaUrl = formData.get('mediaUrl') as string | null;
  const mediaType = formData.get('mediaType') as string | null;

  if (!content && !mediaUrl) {
    return { error: 'Post must contain content or media.' };
  }

  try {
    const post = await prisma.post.create({
      data: {
        content: content || '',
        mediaUrl,
        mediaType: mediaType || 'aurora',
        authorId: currentUser.id,
      },
    });
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/reels');
    return { success: true, post };
  } catch (error) {
    console.error('Create post error:', error);
    return { error: 'Failed to create post.' };
  }
}
