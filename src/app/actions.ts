'use server';

import { prisma } from '../lib/prisma';
import { getSession, setSession, clearSession } from '../lib/session';
import { pusherServer } from '../lib/pusher';
import { hashPassword, verifyPassword } from '../lib/password';

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };
  
  const username = (formData.get('username') as string || '').trim();
  let handle = (formData.get('handle') as string || '').trim().toLowerCase();
  if (handle.startsWith('@')) handle = handle.substring(1);
  
  if (handle.length < 3) return { error: 'Handle must be at least 3 characters' };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { username, handle }
    });
    return { success: true };
  } catch(e) {
    return { error: 'Handle might already be taken' };
  }
}

export async function updateAvatar(url: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };
  
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: url }
  });
  return { success: true };
}

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

      const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
      if (post && post.authorId !== currentUser.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            fromId: currentUser.id,
            type: 'like',
            postId,
            message: `@${currentUser.handle} liked your transmission`,
          },
        }).catch(() => {});
      }

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

      await prisma.notification.create({
        data: {
          userId: authorId,
          fromId: currentUser.id,
          type: 'follow',
          message: `@${currentUser.handle} started tracking your signals (followed you)`,
        },
      }).catch(() => {});

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
  const musicTrack = formData.get('musicTrack') as string | null;
  const visualFilter = formData.get('visualFilter') as string | null;

  if (!content && !mediaUrl) {
    return { error: 'Post must contain content or media.' };
  }

  try {
    const post = await prisma.post.create({
      data: {
        content: content || '',
        mediaUrl,
        mediaType: mediaType || 'aurora',
        musicTrack,
        visualFilter,
        authorId: currentUser.id,
      },
    });
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/reels');
    revalidatePath('/explore');
    return { success: true, post };
  } catch (error) {
    console.error('Create post error:', error);
    return { error: 'Failed to create post.' };
  }
}

export async function savePost(postId: string, isPublic: boolean = false) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const existing = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: currentUser.id,
          postId,
        },
      },
    });

    if (existing) {
      await prisma.savedPost.delete({
        where: { id: existing.id },
      });
      return { success: true, saved: false };
    } else {
      await prisma.savedPost.create({
        data: {
          userId: currentUser.id,
          postId,
          isPublic
        },
      });

      const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
      if (post && post.authorId !== currentUser.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            fromId: currentUser.id,
            type: 'save',
            postId,
            message: `@${currentUser.handle} bookmarked your transmission into their saved archive`,
          },
        }).catch(() => {});
      }

      return { success: true, saved: true };
    }
  } catch (error) {
    console.error('Save post error:', error);
    return { error: 'Failed to toggle saved post.' };
  }
}

export async function addReelComment(
  postId: string,
  content: string,
  xPercent: number,
  yPercent: number
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  const trimmed = (content || '').trim();
  if (!trimmed) return { error: 'Comment cannot be empty.' };

  // Keep inside visible area
  const clampedX = Math.max(5, Math.min(85, xPercent));
  const clampedY = Math.max(8, Math.min(85, yPercent));

  try {
    const comment = await prisma.reelComment.create({
      data: {
        content: trimmed,
        xPercent: clampedX,
        yPercent: clampedY,
        postId,
        userId: currentUser.id,
      },
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
    });

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post && post.authorId !== currentUser.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          fromId: currentUser.id,
          type: 'comment',
          postId,
          message: `@${currentUser.handle} placed a localized note on your reel: "${trimmed.slice(0, 35)}"`,
        },
      }).catch(() => {});
    }

    return { success: true, comment };
  } catch (error: any) {
    console.error('Add reel comment error:', error);
    return { error: error?.message || 'Failed to place comment.' };
  }
}

export async function getReelComments(postId: string) {
  try {
    const comments = await prisma.reelComment.findMany({
      where: { postId },
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
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, comments };
  } catch (error) {
    console.error('Get reel comments error:', error);
    return { error: 'Failed to retrieve comments.', comments: [] };
  }
}

export async function addThreadComment(
  postId: string,
  content: string,
  parentId?: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  const trimmed = (content || '').trim();
  if (!trimmed) return { error: 'Comment cannot be empty.' };

  try {
    const comment = await prisma.reelComment.create({
      data: {
        content: trimmed,
        xPercent: 50,
        yPercent: 50,
        postId,
        userId: currentUser.id,
        parentId: parentId || null,
      },
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
    });

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post && post.authorId !== currentUser.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          fromId: currentUser.id,
          type: 'comment',
          postId,
          message: `@${currentUser.handle} replied to your thread: "${trimmed.slice(0, 35)}"`,
        },
      }).catch(() => {});
    }

    return { success: true, comment };
  } catch (error: any) {
    console.error('Add thread comment error:', error);
    return { error: error?.message || 'Failed to post reply.' };
  }
}

export async function getThreadComments(postId: string) {
  try {
    const comments = await prisma.reelComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
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
    });

    return { success: true, comments };
  } catch (error: any) {
    return { error: error?.message || 'Failed to fetch thread comments.', comments: [] };
  }
}

export async function searchContent(query: string) {
  const clean = query.trim();
  if (!clean) return { success: true, users: [], posts: [] };
  const cleanHandle = clean.replace(/^@/, '');

  try {
    const [users, posts] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: cleanHandle, mode: 'insensitive' } },
            { handle: { contains: cleanHandle, mode: 'insensitive' } },
            { email: { contains: cleanHandle, mode: 'insensitive' } },
            { location: { contains: clean, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          handle: true,
          avatarUrl: true,
          color: true,
          location: true,
          posts: { select: { id: true } },
          followers: { select: { id: true } },
        },
        take: 16,
      }),
      prisma.post.findMany({
        where: {
          OR: [
            { content: { contains: clean, mode: 'insensitive' } },
            { channel: { contains: clean, mode: 'insensitive' } },
            { mediaType: { contains: clean, mode: 'insensitive' } },
          ],
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              handle: true,
              avatarUrl: true,
              color: true,
            },
          },
          likes: true,
          reelComments: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 36,
      }),
    ]);

    return { success: true, users, posts };
  } catch (error) {
    console.error('Search content error:', error);
    return { error: 'Failed to search content.', users: [], posts: [] };
  }
}

export async function getNotifications() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.', notifications: [] };

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: currentUser.id },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            handle: true,
            avatarUrl: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    return { success: true, notifications };
  } catch (error) {
    console.error('Get notifications error:', error);
    return { error: 'Failed to fetch notifications.', notifications: [] };
  }
}

export async function markNotificationsRead() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    await prisma.notification.updateMany({
      where: { userId: currentUser.id, read: false },
      data: { read: true },
    });
    return { success: true };
  } catch (error) {
    console.error('Mark read error:', error);
    return { error: 'Failed to mark read.' };
  }
}

// ───────── STORIES (STATUS) ACTIONS ─────────

export async function createStory(mediaUrl: string, content?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration

    const story = await prisma.story.create({
      data: {
        mediaUrl,
        content: content || null,
        expiresAt,
        authorId: currentUser.id,
      },
    });
    return { success: true, story };
  } catch (error) {
    console.error('Create story error:', error);
    return { error: 'Failed to broadcast story.' };
  }
}

export async function getFeedStories() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: true, stories: [] };

  try {
    // Get stories from users I follow AND myself, which haven't expired
    const following = await prisma.follow.findMany({
      where: { followerId: currentUser.id },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(currentUser.id); // Include my own stories

    const stories = await prisma.story.findMany({
      where: {
        authorId: { in: followingIds },
        expiresAt: { gt: new Date() },
      },
      include: {
        author: {
          select: { id: true, username: true, handle: true, avatarUrl: true, color: true },
        },
        views: {
          where: { userId: currentUser.id },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, stories };
  } catch (error) {
    console.error('Get feed stories error:', error);
    return { error: 'Failed to retrieve stories.', stories: [] };
  }
}

export async function markStoryViewed(storyId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId: currentUser.id } },
      create: { storyId, userId: currentUser.id },
      update: {}, // Do nothing if exists
    });
    return { success: true };
  } catch (error) {
    // Silent catch, this is a background ping
    return { success: false };
  }
}

// ───────── POST MANAGEMENT ACTIONS ─────────

export async function editPostContent(postId: string, newContent: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== currentUser.id) {
      return { error: 'Unauthorized.' };
    }

    await prisma.post.update({
      where: { id: postId },
      data: { content: newContent },
    });
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Edit post error:', error);
    return { error: 'Failed to edit post.' };
  }
}

export async function archivePost(postId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== currentUser.id) return { error: 'Unauthorized.' };

    const nextState = !post.archived;
    await prisma.post.update({
      where: { id: postId },
      data: { archived: nextState },
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true, archived: nextState };
  } catch (error) {
    console.error('Archive post error:', error);
    return { error: 'Failed to archive post.' };
  }
}

export async function deletePost(postId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== currentUser.id) return { error: 'Unauthorized.' };

    await prisma.post.delete({
      where: { id: postId },
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Delete post error:', error);
    return { error: 'Failed to delete post.' };
  }
}

export async function shareReelToChat(postId: string, chatId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated.' };

  try {
    // Generate an absolute link to the reel using dynamic origin or a relative path
    const url = `/reels?post=${postId}`;
    
    // We send a message utilizing the existing sendMessage infrastructure
    const content = `[REEL:${postId}]`;
    
    return await sendMessage(chatId, content, null, null);
  } catch (error) {
    console.error('Share reel error:', error);
    return { error: 'Failed to share reel.' };
  }
}
export async function getPostById(postId: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        likes: true,
        reelComments: { include: { user: true } },
        savedBy: true
      }
    });
    return { success: true, post };
  } catch (error) {
    return { error: 'Failed to get post' };
  }
}

export async function signalCall(chatId: string, payload: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'Not authenticated' };

  try {
    const { pusherServer } = await import('../lib/pusher');
    await pusherServer.trigger(`chat-${chatId}`, 'call-signal', {
      ...payload,
      senderId: currentUser.id,
      senderName: currentUser.username || currentUser.handle || 'Astronaut',
      timestamp: Date.now()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to trigger call-signal:', err);
    return { error: 'Signaling failed' };
  }
}

export async function getShareContacts() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, users: [] };

  try {
    const recentChats = await prisma.chat.findMany({
      where: {
        users: { some: { id: currentUser.id } }
      },
      include: {
        users: {
          select: { id: true, username: true, handle: true, avatarUrl: true, color: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8
    });

    const contactMap = new Map<string, any>();
    recentChats.forEach((c: any) => {
      const other = c.users.find((u: any) => u.id !== currentUser.id);
      if (other && !contactMap.has(other.id)) {
        contactMap.set(other.id, other);
      }
    });

    const following = await prisma.follow.findMany({
      where: { followerId: currentUser.id },
      include: {
        following: {
          select: { id: true, username: true, handle: true, avatarUrl: true, color: true }
        }
      },
      take: 12
    });

    following.forEach((f: any) => {
      if (f.following && !contactMap.has(f.following.id)) {
        contactMap.set(f.following.id, f.following);
      }
    });

    if (contactMap.size < 5) {
      const otherUsers = await prisma.user.findMany({
        where: { id: { not: currentUser.id } },
        select: { id: true, username: true, handle: true, avatarUrl: true, color: true },
        take: 6
      });
      otherUsers.forEach((u: any) => {
        if (!contactMap.has(u.id)) {
          contactMap.set(u.id, u);
        }
      });
    }

    return { success: true, users: Array.from(contactMap.values()) };
  } catch (err) {
    console.error('getShareContacts error:', err);
    return { success: false, users: [] };
  }
}
