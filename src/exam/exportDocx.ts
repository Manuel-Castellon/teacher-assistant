import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import AdmZip from 'adm-zip';

const REFERENCE_DOC = resolve(process.cwd(), 'assets/reference-rtl.docx');

export function markdownToDocx(markdown: string): Buffer {
  const workDir = join(tmpdir(), `exam-docx-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  try {
    const mdPath = join(workDir, 'input.md');
    const docxPath = join(workDir, 'output.docx');
    writeFileSync(mdPath, markdown, 'utf-8');

    execFileSync('pandoc', [
      mdPath,
      '-o', docxPath,
      '--from=markdown',
      '--to=docx',
      `--reference-doc=${REFERENCE_DOC}`,
    ], { timeout: 15_000 });

    const docxBuffer = readFileSync(docxPath);
    return injectBidi(docxBuffer);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

// Inject <w:bidi/> into every paragraph's properties so Word
// renders all paragraphs RTL, even ones containing LTR math.
export function injectBidi(docx: Buffer): Buffer {
  const zip = new AdmZip(docx);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) return docx;

  let xml = entry.getData().toString('utf-8');

  // Add <w:bidi/> inside existing <w:pPr> that lack it
  xml = xml.replace(/<w:pPr>((?:(?!<w:bidi).)*)(<\/w:pPr>)/g, '<w:pPr>$1<w:bidi/>$2');

  // Wrap bare paragraphs (no <w:pPr> at all) with bidi properties
  xml = xml.replace(/<w:p>((?:(?!<w:pPr>).)*?)(<w:r[ >])/g, '<w:p><w:pPr><w:bidi/></w:pPr>$1$2');

  zip.updateFile(entry, Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}
