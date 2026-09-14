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

  try {
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    return NextResponse.json({
      success: true,
      database: 'Connected successfully to CockroachDB',
      maskedUrl,
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
    }, { status: 500 });
  }
}
