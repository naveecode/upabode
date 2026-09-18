'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HeaderActions from './HeaderActions';

import MultigramLogo from './MultigramLogo';

export default function AppHeader({ user }: { user: any }) {
  const pathname = usePathname();

  // Hide the upper panel completely during full-screen Reels and active Chatrooms
  if (pathname.startsWith('/reels') || (pathname.startsWith('/chat/') && pathname !== '/chat')) {
    return null;
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark" style={{ background: 'rgba(7, 17, 31, 0.9)', padding: '2px' }}>
          <MultigramLogo size={32} color="var(--earth)" />
        </span>
        <span className="brand-name">Multigram</span>
      </Link>
      <div className="topbar-right flex items-center gap-3">
        <HeaderActions user={user} />
      </div>
    </header>
  );
}
