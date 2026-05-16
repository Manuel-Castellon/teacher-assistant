import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { listGeneratedArtifacts } from '@/artifacts/serverStore';
import type { GeneratedArtifactKind } from '@/artifacts/types';

const KINDS = new Set<GeneratedArtifactKind>(['lesson_plan', 'exam', 'rubric']);

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? session?.user?.email ?? undefined;
  if (!userId) return NextResponse.json({ authenticated: false, artifacts: [] });

  const url = new URL(request.url);
  const kindParam = url.searchParams.get('kind');
  const kind = kindParam && KINDS.has(kindParam as GeneratedArtifactKind)
    ? kindParam as GeneratedArtifactKind
    : undefined;
  const limit = Number(url.searchParams.get('limit') ?? '20');

  try {
    const artifacts = await listGeneratedArtifacts(pool, userId, {
      ...(kind ? { kind } : {}),
      limit: Number.isFinite(limit) ? limit : 20,
    });
    return NextResponse.json({ authenticated: true, artifacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
