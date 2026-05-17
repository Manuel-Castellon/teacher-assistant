import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { loadQuestionBankItem } from '@/questionBank/serverStore';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    const item = await loadQuestionBankItem(pool, id);
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed to load item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
