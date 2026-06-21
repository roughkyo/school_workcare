import { NextResponse, type NextRequest } from 'next/server';
import { getSessionTeacher } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const teacher = getSessionTeacher(request);
  if (!teacher) {
    return NextResponse.json({ teacher: null }, { status: 401 });
  }
  return NextResponse.json({ teacher });
}
