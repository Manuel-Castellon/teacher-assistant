"""Dump raw text from a Hebrew Ministry curriculum PDF.

Usage: .venv/bin/python extract_text.py <input.pdf>
Run from project root or this dir; writes <input>.txt next to the PDF.

PyMuPDF (fitz) preserves logical (RTL) order for Hebrew when using
sort=True with get_text("text"). We dump per-page so we can eyeball
section boundaries before writing the structured parser.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf  # type: ignore[import-untyped]


def extract(pdf_path: Path) -> str:
    """Extract text in logical (Hebrew RTL-correct) order.

    PyMuPDF returns words in visual (left-to-right page) order. For Hebrew
    this means words on a line are reversed. We pull words with bounding
    boxes, group by line (y-bucket), and sort within each line by x DESC
    so that the rightmost word comes first — matching reading order.
    """
    doc = pymupdf.open(pdf_path)
    chunks: list[str] = []
    for page_idx, page in enumerate(doc, start=1):
        words = page.get_text("words")  # (x0, y0, x1, y1, word, block, line, word_no)
        # Group by (block, line) to preserve PDF's own line grouping.
        lines: dict[tuple[int, int], list[tuple[float, str]]] = {}
        for x0, _y0, _x1, _y1, word, block, line, _wno in words:
            lines.setdefault((block, line), []).append((x0, word))
        line_keys = sorted(lines.keys())  # block then line, both ascending = top-to-bottom
        out_lines: list[str] = []
        for key in line_keys:
            # Hebrew reads right-to-left, so sort x DESC.
            sorted_words = sorted(lines[key], key=lambda t: -t[0])
            out_lines.append(" ".join(w for _x, w in sorted_words))
        chunks.append(f"===== PAGE {page_idx} =====\n" + "\n".join(out_lines))
    doc.close()
    return "\n".join(chunks)


def main() -> None:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <input.pdf>", file=sys.stderr)
        sys.exit(2)
    pdf = Path(sys.argv[1]).resolve()
    if not pdf.exists():
        print(f"not found: {pdf}", file=sys.stderr)
        sys.exit(1)
    out = pdf.with_suffix(".txt")
    out.write_text(extract(pdf), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
