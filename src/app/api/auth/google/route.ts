import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : `${protocol}://${host}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  
  const url = new URL(request.url);
  const returnUrl = url.searchParams.get('returnUrl') || '/';
  const statePayload = JSON.stringify({ returnUrl });
  const encodedState = Buffer.from(statePayload).toString('base64');

  console.log('[Google Auth] Initializing login...', { host, protocol, appUrl, redirectUri, returnUrl });

  if (!clientId) {
    return NextResponse.json({ error: 'Google Client ID is not configured.' }, { status: 500 });
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile&access_type=offline&prompt=select_account&state=${encodedState}`;
  
  return NextResponse.redirect(googleAuthUrl);
}
