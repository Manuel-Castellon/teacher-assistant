import AdmZip from 'adm-zip';
import { injectBidi, markdownToDocx } from './exportDocx';

function docxWithDocumentXml(xml: string): Buffer {
  const zip = new AdmZip();
  zip.addFile('word/document.xml', Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}

describe('injectBidi', () => {
  it('adds bidi properties to paragraphs with and without paragraph props', () => {
    const docx = docxWithDocumentXml(
      '<w:document><w:body>' +
      '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>שלום</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>x=1</w:t></w:r></w:p>' +
      '</w:body></w:document>',
    );

    const out = new AdmZip(injectBidi(docx));
    const xml = out.getEntry('word/document.xml')!.getData().toString('utf-8');

    expect(xml).toContain('<w:jc w:val="right"/><w:bidi/>');
    expect(xml).toContain('<w:p><w:pPr><w:bidi/></w:pPr><w:r>');
  });

  it('does not duplicate existing bidi properties', () => {
    const docx = docxWithDocumentXml('<w:document><w:body><w:p><w:pPr><w:bidi/></w:pPr><w:r/></w:p></w:body></w:document>');
    const out = new AdmZip(injectBidi(docx));
    const xml = out.getEntry('word/document.xml')!.getData().toString('utf-8');
    expect((xml.match(/<w:bidi\/>/g) ?? [])).toHaveLength(1);
  });

  it('returns the original buffer when document.xml is missing', () => {
    const zip = new AdmZip();
    zip.addFile('docProps/core.xml', Buffer.from('<xml/>'));
    const docx = zip.toBuffer();
    expect(injectBidi(docx)).toBe(docx);
  });
});

describe('markdownToDocx', () => {
  it('converts markdown to a docx buffer and injects bidi into document paragraphs', () => {
    const docx = markdownToDocx('שלום\n\n$x = 1$');
    const zip = new AdmZip(docx);
    const xml = zip.getEntry('word/document.xml')!.getData().toString('utf-8');

    expect(docx.length).toBeGreaterThan(1000);
    expect(xml).toContain('<w:bidi/>');
    expect(xml).toContain('שלום');
  });
});
