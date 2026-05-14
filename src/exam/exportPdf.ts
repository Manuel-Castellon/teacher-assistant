import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const RTL_CSS = `
html { direction: rtl; }
body {
  direction: rtl;
  font-family: "Noto Sans Hebrew", "Noto Sans", Arial, sans-serif;
  line-height: 1.55;
  margin: 0 auto;
  max-width: 920px;
  padding: 28px 36px;
  color: #111827;
}
h1, h2, h3 { line-height: 1.25; page-break-after: avoid; }
h1 { font-size: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
h2 { font-size: 18px; margin-top: 26px; }
h3 { font-size: 15px; margin-top: 18px; }
table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; vertical-align: top; }
th:last-child, td:last-child { text-align: center; width: 90px; }
code, .math { direction: ltr; unicode-bidi: isolate; }
@page { size: A4; margin: 16mm; }
`;

export function markdownToPdf(markdown: string): Buffer {
  const workDir = join(tmpdir(), `exam-pdf-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  try {
    const mdPath = join(workDir, 'input.md');
    const htmlPath = join(workDir, 'input.html');
    const cssPath = join(workDir, 'style.css');
    const pdfPath = join(workDir, 'output.pdf');

    writeFileSync(mdPath, markdown, 'utf-8');
    writeFileSync(cssPath, RTL_CSS, 'utf-8');

    execFileSync('pandoc', [
      mdPath,
      '-o', htmlPath,
      '--from=markdown',
      '--to=html',
      '--standalone',
      '--mathml',
      '--metadata', 'lang=he',
      '--metadata', 'dir=rtl',
      `--css=${cssPath}`,
    ], { timeout: 15_000 });

    execFileSync('google-chrome', [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      `file://${htmlPath}`,
    ], { timeout: 30_000 });

    return readFileSync(pdfPath);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
