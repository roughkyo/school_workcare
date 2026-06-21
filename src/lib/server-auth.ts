import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { Teacher } from '@/lib/auth';

export const SESSION_COOKIE_NAME = 'school-workcare-session';

const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = Teacher & {
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SCHOOL_WORKCARE_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SCHOOL_WORKCARE_SESSION_SECRET must be at least 32 characters.');
  }
  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken(teacher: Teacher): string {
  const payload: SessionPayload = {
    ...teacher,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined): Teacher | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  let expectedSignature: string;
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.id || !payload.name || !payload.role) return null;
    return {
      id: payload.id,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getSessionTeacher(request: NextRequest): Teacher | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function credentialsAreConfigured(): boolean {
  const sessionSecret = process.env.SCHOOL_WORKCARE_SESSION_SECRET;
  return Boolean(
    process.env.SCHOOL_WORKCARE_TEACHER_NAME &&
      process.env.SCHOOL_WORKCARE_TEACHER_PASSWORD &&
      sessionSecret &&
      sessionSecret.length >= 32
  );
}

export function verifyTeacherCredentials(name: string, password: string): Teacher | null {
  const expectedName = process.env.SCHOOL_WORKCARE_TEACHER_NAME;
  const expectedPassword = process.env.SCHOOL_WORKCARE_TEACHER_PASSWORD;

  if (!expectedName || !expectedPassword) return null;

  if (!constantTimeEqual(name, expectedName) || !constantTimeEqual(password, expectedPassword)) {
    return null;
  }

  return {
    id: expectedName.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'teacher',
    name: expectedName,
    role: 'admin',
  };
}
