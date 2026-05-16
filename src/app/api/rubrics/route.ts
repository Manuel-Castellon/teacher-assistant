import { NextResponse } from 'next/server';
import { listExamRubrics } from '@/examRubric/loadRubrics';

export async function GET() {
  try {
    const summaries = listExamRubrics();
    return NextResponse.json({ rubrics: summaries });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list rubrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
