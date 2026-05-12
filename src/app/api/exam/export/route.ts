import { NextResponse } from 'next/server';
import { markdownToDocx } from '@/exam/exportDocx';

interface ExportRequest {
  markdown: string;
  filename: string;
}

export async function POST(request: Request) {
  try {
    const { markdown, filename } = (await request.json()) as ExportRequest;

    if (!markdown) {
      return NextResponse.json({ error: 'Missing markdown' }, { status: 400 });
    }

    const docxBuffer = markdownToDocx(markdown);
    const rawName = filename || 'exam';
    const encodedName = encodeURIComponent(rawName);

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="exam.docx"; filename*=UTF-8''${encodedName}.docx`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
