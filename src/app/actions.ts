'use server';

import { prisma } from '../lib/prisma';
import { getSession, setSession, clearSession } from '../lib/session';
import { pusherServer } from '../lib/pusher';
import { hashPassword, verifyPassword } from '../lib/password';

export async function registerUser(formData: FormData) {
  const username = (formData.get('username') as string || '').trim();
  let handle = (formData.get('handle') as string || '').trim().toLowerCase();
  if (handle.startsWith('@')) handle = handle.substring(1);

  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string || '';
  const location = (formData.get('location') as string || '').trim();
  // Support both 'avatarColor' and 'color'
  const color = (formData.get('avatarColor') as string) || (formData.get('color') as string) || 'green';

  if (!username) {
    return { error: 'Username is required.' };
  }
  if (!handle) {
    return { error: 'Handle is required.' };
  }
  if (!email || !email.includes('@')) {
    return { error: 'Valid email address is required.' };
  }
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  try {
    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existingEmail) {
      return { error: 'An account with this email already exists.' };
    }

    const existingHandle = await prisma.user.findFirst({
      where: { handle: { equals: handle, mode: 'insensitive' } },
    });
    if (existingHandle) {
      return { error: 'This handle is already taken.' };
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (existingUsername) {
      return { error: 'This username is already taken.' };
    }

    const hashedPassword = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        handle,
        email,
        password: hashedPassword,
        location: location || null,
        color: color || 'green',
        avatarUrl: username.substring(0, 2).toUpperCase(),
      },
    });

    await setSession(user.id);
    return { success: true, userId: user.id };
  } catch (error: any) {
    console.error('Register error:', error);
    return { error: error?.message || 'Failed to register user.' };
  }
}

export async function loginUser(formData: FormData) {
  // Support either email or handle as the login identifier
  const emailInput = (formData.get('email') as string || '').trim().toLowerCase();
  const handleInput = (formData.get('handle') as string || '').trim().toLowerCase().replace(/^@/, '');
  const identifier = emailInput || handleInput;
  const password = formData.get('password') as string || '';

  if (!identifier) {
    return { error: 'Email or handle is required.' };
  }
  if (!password) {
    return { error: 'Password is required.' };
  }

  try {
    // Find user by email or handle
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { handle: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return { error: 'No account found with these credentials.' };
    }

    // Verify password if user has password set
    if (user.password) {
      const isValid = verifyPassword(password, user.password);
      if (!isValid) {
        return { error: 'Invalid password. Please try again.' };
      }
    }

    await setSession(user.id);
    return { success: true, userId: user.id };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error?.message || 'Failed to login.' };
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
      select: {
        id: true,
        username: true,
        handle: true,
        email: true,
        avatarUrl: true,
        color: true,
        location: true,
        createdAt: true,
      },
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

export async function sendMessage(
  chatId: string,
  content: string,
  mediaUrl?: string | null,
  voiceUrl?: string | null
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    // If voice note was passed as mediaUrl or voiceUrl
    const effectiveVoiceUrl = voiceUrl || (mediaUrl?.startsWith('data:audio') ? mediaUrl : null);
    const effectiveMediaUrl = effectiveVoiceUrl ? null : mediaUrl;

    const message = await prisma.message.create({
      data: {
        content: content || (effectiveVoiceUrl ? '🎤 Voice Transmission' : '📷 Image'),
        mediaUrl: effectiveMediaUrl,
        voiceUrl: effectiveVoiceUrl,
        chatId,
        senderId: currentUser.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            handle: true,
            avatarUrl: true,
            color: true,
          },
        },
      },
    });

    // Also touch the chat updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    // Safe Pusher Broadcast with payload size check (Pusher hard limit is 10240 bytes)
    try {
      const payloadStr = JSON.stringify(message);
      if (payloadStr.length > 8192) {
        // Omit huge base64 data URL to prevent Pusher 413 error
        const lightPayload = {
          ...message,
          mediaUrl: message.mediaUrl?.startsWith('data:') ? 'large-media' : message.mediaUrl,
          voiceUrl: message.voiceUrl?.startsWith('data:') ? 'large-voice' : message.voiceUrl,
          requiresFetch: true,
        };
        await pusherServer.trigger(`chat-${chatId}`, 'new-message', lightPayload);
      } else {
        await pusherServer.trigger(`chat-${chatId}`, 'new-message', message);
      }
    } catch (pusherErr) {
      console.warn('Pusher delivery notice:', pusherErr);
    }

    return { success: true, message };
  } catch (error: any) {
    console.error('Send message error:', error);
    return { error: error?.message || 'Failed to send message.' };
  }
}

export async function getMessageById(messageId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, username: true, handle: true, avatarUrl: true, color: true },
        },
      },
    });
    return message;
  } catch (err) {
    console.error('Get message error:', err);
    return null;
  }
}

export async function searchUsers(query: string) {
  const currentUser = await getCurrentUser();
  
  try {
    const cleanQuery = query.trim().replace(/^@/, '');
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: cleanQuery, mode: 'insensitive' } },
          { handle: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
        ],
        NOT: currentUser ? { id: currentUser.id } : undefined,
      },
      select: {
        id: true,
        username: true,
        handle: true,
        avatarUrl: true,
        color: true,
        location: true,
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
