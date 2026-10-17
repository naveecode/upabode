import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '../../../../lib/pusher'

export async function POST(req: NextRequest) {
  try {
    let chatId = ''
    try {
      const body = await req.json()
      chatId = body?.chatId || ''
    } catch {
      chatId = req.nextUrl.searchParams.get('chatId') || ''
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })
    }

    // Broadcast call-rejected signal so caller's active ringing/call terminates immediately
    await pusherServer.trigger(`chat-${chatId}`, 'call-signal', {
      type: 'call-rejected',
      timestamp: Date.now()
    }).catch(err => {
      console.warn('Failed broadcasting call-rejected via Pusher:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Call decline route error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
