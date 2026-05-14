import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import AdmZip from 'adm-zip';

const [, , markdownArg, outputBaseArg] = process.argv;

if (!markdownArg) {
  console.error('Usage: node scripts/export-markdown.mjs <input.md> [output-base]');
  process.exit(1);
}

const markdownPath = resolve(markdownArg);
const outputBase = outputBaseArg
  ? resolve(outputBaseArg)
  : join(dirname(markdownPath), basename(markdownPath, extname(markdownPath)));
const referenceDoc = resolve(process.cwd(), 'assets/reference-rtl.docx');

const docxPath = `${outputBase}.docx`;
const pdfPath = `${outputBase}.pdf`;

function injectBidi(docx) {
  const zip = new AdmZip(docx);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return docx;

  let xml = entry.getData().toString('utf-8');
  xml = xml.replace(/<w:pPr>((?:(?!<w:bidi).)*)(<\/w:pPr>)/g, '<w:pPr>$1<w:bidi/>$2');
  xml = xml.replace(/<w:p>((?:(?!<w:pPr>).)*?)(<w:r[ >])/g, '<w:p><w:pPr><w:bidi/></w:pPr>$1$2');

  zip.updateFile(entry, Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}

function exportDocx() {
  const workDir = mkdtempSync(join(tmpdir(), 'markdown-docx-'));
  try {
    const rawDocxPath = join(workDir, 'output.docx');
    execFileSync('pandoc', [
      markdownPath,
      '-o', rawDocxPath,
      '--from=markdown',
      '--to=docx',
      `--reference-doc=${referenceDoc}`,
    ], { stdio: 'inherit', timeout: 15_000 });

    writeFileSync(docxPath, injectBidi(readFileSync(rawDocxPath)));
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function exportPdfWithLatex() {
  execFileSync('pandoc', [
    markdownPath,
    '-o', pdfPath,
    '--from=markdown',
    '--pdf-engine=lualatex',
    '-V', 'lang=he',
    '-V', 'dir=rtl',
    '-V', 'mainfont=Noto Sans Hebrew',
    '-V', 'sansfont=Noto Sans Hebrew',
    '-V', 'monofont=DejaVu Sans Mono',
    '-V', 'geometry=margin=1.7cm',
  ], { stdio: 'inherit', timeout: 30_000 });
}

function exportPdfWithChrome() {
  const workDir = mkdtempSync(join(tmpdir(), 'markdown-pdf-'));
  try {
    const htmlPath = join(workDir, 'input.html');
    const cssPath = join(workDir, 'style.css');
    writeFileSync(cssPath, `
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
    `, 'utf-8');

    execFileSync('pandoc', [
      markdownPath,
      '-o', htmlPath,
      '--from=markdown',
      '--to=html',
      '--standalone',
      '--mathml',
      '--metadata', 'lang=he',
      '--metadata', 'dir=rtl',
      `--css=${cssPath}`,
    ], { stdio: 'inherit', timeout: 15_000 });

    execFileSync('google-chrome', [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      `file://${htmlPath}`,
    ], { stdio: 'inherit', timeout: 30_000 });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function exportPdf() {
  try {
    execFileSync('google-chrome', ['--version'], { stdio: 'ignore', timeout: 5_000 });
    exportPdfWithChrome();
  } catch {
    console.warn('Headless Chrome PDF export failed; falling back to LaTeX.');
    exportPdfWithLatex();
  }
}

exportDocx();
exportPdf();

console.log(`Wrote ${docxPath}`);
console.log(`Wrote ${pdfPath}`);
