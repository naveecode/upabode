import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let socketId = '';
    let channelName = '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      socketId = formData.get('socket_id') as string || '';
      channelName = formData.get('channel_name') as string || '';
    } else {
      const json = await req.json().catch(() => ({}));
      socketId = json.socket_id || '';
      channelName = json.channel_name || '';
    }

    if (!socketId || !channelName) {
      return new NextResponse('Missing socket_id or channel_name', { status: 400 });
    }

    // Authorize presence channel
    const presenceData = {
      user_id: currentUser.id,
      user_info: {
        id: currentUser.id,
        username: currentUser.username,
        handle: currentUser.handle,
        avatarUrl: currentUser.avatarUrl,
        color: currentUser.color || 'green',
      },
    };

    const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Pusher Auth Error', { status: 500 });
  }
}
