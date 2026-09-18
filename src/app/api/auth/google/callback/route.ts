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

    // Sanitize returnUrl so users are never redirected back to login/register pages
    if (!returnUrl || returnUrl === '/auth/login' || returnUrl === '/auth/register' || returnUrl.includes('/auth/')) {
      returnUrl = '/';
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
          username: googleUser.name || 'Multigram Explorer',
          handle: uniqueHandle,
          email: googleUser.email,
          avatarUrl: googleUser.picture || null,
          password: 'google-oauth-placeholder',
          color: 'green',
          onboarded: true, // Brand new Google users are ready to experience the app immediately
        },
      });
    } else {
      // Existing user: ensure they are never nagged for username/avatar setup again
      if (!user.onboarded) {
        await prisma.user.update({
          where: { id: user.id },
          data: { onboarded: true },
        });
        user.onboarded = true;
      }
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

    const destination = returnUrl.startsWith('http') ? returnUrl : `${baseUrl}${returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`}`;

    // Check if user agent or request originates from Android CustomTabs / native app
    const userAgent = request.headers.get('user-agent') || '';
    const isNativeApp = /MultigramApp|OrbitApp/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    const cookieHeader = `orbit-session=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

    if (isNativeApp || isAndroid) {
      const intentUrl = `intent://auth-callback?session_token=${encodeURIComponent(token)}&returnUrl=${encodeURIComponent(returnUrl)}#Intent;scheme=multigram;package=com.upabode.orbit;end`;
      const fallbackSchemeUrl = `multigram://auth-callback?session_token=${encodeURIComponent(token)}&returnUrl=${encodeURIComponent(returnUrl)}`;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logging into Multigram...</title>
  <style>
    body { background: #07111F; color: #F3F7FB; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; text-align: center; }
    .spinner { width: 50px; height: 50px; border: 4px solid rgba(64,201,162,0.2); border-top-color: #40C9A2; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 24px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn { display: inline-block; background: #40C9A2; color: #07111F; font-weight: 700; padding: 14px 28px; border-radius: 14px; text-decoration: none; font-size: 16px; margin-top: 20px; box-shadow: 0 4px 14px rgba(64,201,162,0.3); }
    .btn-sub { display: block; color: #91A5BA; font-size: 13px; text-decoration: underline; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2 style="margin: 0 0 8px 0; font-size: 22px;">Multigram Authenticated</h2>
  <p style="color: #91A5BA; margin: 0; font-size: 15px;">Entering Orbit...</p>

  <a id="intent-btn" href="${intentUrl}" class="btn">Open Multigram App</a>
  <a href="${fallbackSchemeUrl}" class="btn-sub">Tap here if app didn't open automatically</a>

  <script>
    try {
      window.location.href = "${intentUrl}";
    } catch(e) {}
    setTimeout(function() {
      try {
        window.location.href = "${fallbackSchemeUrl}";
      } catch(e) {}
    }, 400);
    setTimeout(function() {
      try { window.location.replace("${destination}"); } catch(e) {}
    }, 1500);
  </script>
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': cookieHeader,
        },
      });
    }

    return NextResponse.redirect(destination, {
      headers: {
        'Set-Cookie': cookieHeader,
      },
    });
  } catch (err) {
    console.error('Google OAuth Error:', err);
    return NextResponse.redirect(`${baseUrl}/auth/login?error=OAuthException`);
  }
}

