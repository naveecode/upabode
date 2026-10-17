import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../actions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
