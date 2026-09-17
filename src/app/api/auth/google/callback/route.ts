import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { setSession } from '../../../../../lib/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const state = url.searchParams.get('state');
  let returnUrl = '/';
  if (state) {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.returnUrl) returnUrl = parsed.returnUrl;
    } catch {}
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : `${protocol}://${host}`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided.' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google Token Error:', tokenData);
      return NextResponse.redirect(`${baseUrl}/auth/login?error=GoogleAuthFailed`);
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userResponse.json();

    if (!userResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=GoogleUserFailed`);
    }

    // Upsert user in DB
    let user = await prisma.user.findFirst({
      where: { email: googleUser.email },
    });

    if (!user) {
      // Create a new user
      const safeName = (googleUser.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '');
      const baseHandle = safeName.substring(0, 15);
      const uniqueHandle = `${baseHandle}_${Math.floor(Math.random() * 1000)}`;
      
      user = await prisma.user.create({
        data: {
          username: googleUser.name || 'Cosmic Traveler',
          handle: uniqueHandle,
          email: googleUser.email,
          avatarUrl: googleUser.picture || null,
          password: 'google-oauth-placeholder',
          color: 'green',
          onboarded: false, // Prompt User ID and profile picture on first login!
        },
      });
    } else {
      // Update avatar if missing
      if (!user.avatarUrl && googleUser.picture) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: googleUser.picture },
        });
      }
    }

    // Set JWT Session
    await setSession(user.id);
    const { encrypt } = await import('../../../../../lib/session');
    const token = await encrypt({ userId: user.id });

    // Check if user agent or request originates from Android CustomTabs / app
    const userAgent = request.headers.get('user-agent') || '';
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logging into Upabode Orbit...</title>
  <style>
    body { background: #07111F; color: #40C9A2; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .spinner { width: 44px; height: 44px; border: 3px solid rgba(64,201,162,0.2); border-top-color: #40C9A2; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Connecting to Upabode Orbit...</p>
  <script>
    try {
      window.location.replace("orbit://auth-callback?session_token=" + encodeURIComponent("${token}") + "&returnUrl=" + encodeURIComponent("${returnUrl}"));
    } catch(e) {}
    setTimeout(function() {
      try { window.close(); } catch(e) {}
    }, 400);
  </script>
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    const destination = returnUrl.startsWith('http') ? returnUrl : `${baseUrl}${returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`}`;
    return NextResponse.redirect(destination);
  } catch (err) {
    console.error('Google OAuth Error:', err);
    return NextResponse.redirect(`${baseUrl}/auth/login?error=OAuthException`);
  }
}

