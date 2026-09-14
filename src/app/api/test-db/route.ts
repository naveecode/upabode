import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    return NextResponse.json({
      success: false,
      error: 'DATABASE_URL environment variable is NOT SET in Render Dashboard!',
      hasDbUrl: false,
    }, { status: 500 });
  }

  // Mask password for safety in display
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');

  // Parse connection URL safely to inspect credentials without leaking secrets
  const match = dbUrl.match(/:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*?)(\?|$)/);
  const parsed = match ? {
    username: match[1],
    passwordLength: match[2].length,
    passwordHint: match[2].length >= 4 ? `${match[2].slice(0, 2)}...${match[2].slice(-2)}` : 'too-short',
    host: match[3],
    port: match[4],
    database: match[5],
  } : null;

  try {
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    return NextResponse.json({
      success: true,
      database: 'Connected successfully to CockroachDB',
      maskedUrl,
      parsed,
      userCount,
      postCount,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      code: err.code,
      name: err.name,
      maskedUrl,
      parsed,
    }, { status: 500 });
  }
}
