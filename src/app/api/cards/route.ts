import { NextResponse, type NextRequest } from 'next/server';
import { getSessionTeacher } from '@/lib/server-auth';
import type { MindMapNode } from '@/types/department-card';

export const runtime = 'nodejs';

function getSheetApiUrl(): string | null {
  const url = process.env.SCHOOL_WORKCARE_SHEET_API_URL;
  return url ? url.trim().replace(/^['"]|['"]$/g, '') : null;
}

export async function GET() {
  const apiUrl = getSheetApiUrl();
  if (!apiUrl) {
    return NextResponse.json({ success: false, cards: [] }, { status: 503 });
  }

  try {
    const upstream = await fetch(apiUrl, { method: 'GET', cache: 'no-store' });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.ok ? 200 : upstream.status });
  } catch {
    return NextResponse.json({ success: false, cards: [] }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const teacher = getSessionTeacher(request);
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiUrl = getSheetApiUrl();
  if (!apiUrl) {
    return NextResponse.json({ error: 'Sheet API is not configured.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; cards?: unknown }
    | null;
  if (body?.action !== 'syncAll' || !Array.isArray(body.cards)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'syncAll', cards: body.cards as MindMapNode[] }),
    });

    return NextResponse.json({ success: upstream.ok }, { status: upstream.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ success: false }, { status: 502 });
  }
}
