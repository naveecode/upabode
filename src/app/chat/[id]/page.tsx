import { getCurrentUser } from '../../actions'
import { prisma } from '../../../lib/prisma'
import { redirect } from 'next/navigation'
import ChatRoom from '../../../components/ChatRoom'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { id } = await params

  const chat = await prisma.chat.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, username: true, handle: true, avatarUrl: true, color: true }
      },
      messages: {
        include: { sender: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!chat) {
    redirect('/chat')
  }

  // Ensure current user is part of this chat
  if (!chat.users.some((u) => u.id === user.id)) {
    redirect('/chat')
  }

  const otherUser = chat.users.find((u) => u.id !== user.id) || chat.users[0]

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', height: '100%', width: '100%' }}>
      <ChatRoom 
        chatId={chat.id} 
        initialMessages={chat.messages} 
        currentUser={user} 
        otherUser={otherUser} 
      />
    </div>
  )
}
