import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { setSession } from '../../../../../lib/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

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
      const baseHandle = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      const uniqueHandle = `${baseHandle}_${Math.floor(Math.random() * 1000)}`;
      
      user = await prisma.user.create({
        data: {
          username: googleUser.name || 'Cosmic Traveler',
          handle: uniqueHandle,
          email: googleUser.email,
          avatarUrl: googleUser.picture || null,
          password: 'google-oauth-placeholder', // Since they login via Google
          color: 'green',
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

    return NextResponse.redirect(`${baseUrl}/`);
  } catch (err) {
    console.error('Google OAuth Error:', err);
    return NextResponse.redirect(`${baseUrl}/auth/login?error=OAuthException`);
  }
}
