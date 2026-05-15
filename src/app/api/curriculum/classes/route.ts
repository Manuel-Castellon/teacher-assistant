import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import {
  listClassProgressProfiles,
  replaceClassProgressProfiles,
} from '@/curriculumProgress/serverStore';
import type { ClassProgressProfile } from '@/curriculumProgress/progress';

interface SaveClassesBody {
  profiles?: ClassProgressProfile[];
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ authenticated: false, profiles: [] });

  const profiles = await listClassProgressProfiles(pool, userId);
  return NextResponse.json({ authenticated: true, profiles });
}

export async function PUT(request: Request) {
  const userId = await requireUserId();
  const body = (await request.json()) as SaveClassesBody;
  if (!Array.isArray(body.profiles)) {
    return NextResponse.json({ error: 'Missing profiles array' }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ authenticated: false, profiles: body.profiles });

  const client = await pool.connect();
  try {
    const profiles = await replaceClassProgressProfiles(client, userId, body.profiles);
    return NextResponse.json({ authenticated: true, profiles });
  } finally {
    client.release();
  }
}

async function requireUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id ?? session?.user?.email ?? undefined;
}
