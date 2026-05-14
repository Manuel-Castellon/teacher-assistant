import { NextResponse } from 'next/server';
import { markdownToDocx } from '@/exam/exportDocx';
import { markdownToPdf } from '@/exam/exportPdf';

interface ExportRequest {
  markdown: string;
  filename: string;
  format?: 'docx' | 'pdf';
}

export async function POST(request: Request) {
  try {
    const { markdown, filename, format = 'docx' } = (await request.json()) as ExportRequest;

    if (!markdown) {
      return NextResponse.json({ error: 'Missing markdown' }, { status: 400 });
    }

    const rawName = filename || 'exam';
    const encodedName = encodeURIComponent(rawName);

    if (format === 'pdf') {
      const pdfBuffer = markdownToPdf(markdown);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="document.pdf"; filename*=UTF-8''${encodedName}.pdf`,
        },
      });
    }

    const docxBuffer = markdownToDocx(markdown);
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
