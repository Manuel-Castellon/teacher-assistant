import { NextResponse } from 'next/server';
import { loadExamRubric } from '@/examRubric/loadRubrics';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid rubric id' }, { status: 400 });
  }

  try {
    const { rubric, markdown } = loadExamRubric(id);
    return NextResponse.json({ rubric, markdown });
  } catch (err) {
    const fsErr = err as NodeJS.ErrnoException;
    const status = fsErr?.code === 'ENOENT' ? 404 : 500;
    const message = fsErr?.message ?? 'Failed to load rubric';
    return NextResponse.json({ error: message }, { status });
  }
}
