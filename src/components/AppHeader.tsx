'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HeaderActions from './HeaderActions';

export default function AppHeader({ user }: { user: any }) {
  const pathname = usePathname();

  // Hide the upper panel completely during full-screen Reels and active Chatrooms
  if (pathname.startsWith('/reels') || (pathname.startsWith('/chat/') && pathname !== '/chat')) {
    return null;
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <img src="/icon.png" alt="Upabode" width={38} height={38} />
        </span>
        <span className="brand-name">Upabode</span>
      </Link>
      <div className="topbar-right flex items-center gap-3">
        <HeaderActions user={user} />
      </div>
    </header>
  );
}
