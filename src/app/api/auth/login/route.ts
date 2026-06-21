import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  credentialsAreConfigured,
  getSessionCookieOptions,
  verifyTeacherCredentials,
} from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!credentialsAreConfigured()) {
    return NextResponse.json({ error: 'Auth is not configured.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; password?: unknown }
    | null;
  const name = typeof body?.name === 'string' ? body.name : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const teacher = verifyTeacherCredentials(name, password);

  if (!teacher) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const response = NextResponse.json({ teacher });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(teacher), getSessionCookieOptions());
  return response;
}
