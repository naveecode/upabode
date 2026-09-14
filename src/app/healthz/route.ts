import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'orbit-app',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
