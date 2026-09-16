import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Google Client ID is not configured.' }, { status: 500 });
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;
  
  return NextResponse.redirect(googleAuthUrl);
}
