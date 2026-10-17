with open('src/app/api/auth/google/route.ts', 'w', encoding='utf-8') as f:
    f.write('''import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\\/\$/, '') : \\://\System.Management.Automation.Internal.Host.InternalHost\;
  const redirectUri = \\/api/auth/google/callback\;

  if (!clientId) {
    return NextResponse.json({ error: 'Google Client ID is not configured.' }, { status: 500 });
  }

  const googleAuthUrl = \https://accounts.google.com/o/oauth2/v2/auth?client_id=\&redirect_uri=\&response_type=code&scope=email profile&access_type=offline&prompt=consent\;
  
  return NextResponse.redirect(googleAuthUrl);
}
''')
