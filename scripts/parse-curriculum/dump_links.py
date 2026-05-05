"""Dump all link rectangles + URIs from a PDF page.

Usage: .venv/bin/python dump_links.py <input.pdf> [page_index]
Defaults to page 0. Prints one link per line: rect | uri.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf  # type: ignore[import-untyped]


def main() -> None:
    if len(sys.argv) < 2:
        print(f"usage: {sys.argv[0]} <pdf> [page_index]", file=sys.stderr)
        sys.exit(2)
    pdf = Path(sys.argv[1]).resolve()
    page_idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    doc = pymupdf.open(pdf)
    page = doc[page_idx]
    pw, ph = page.rect.width, page.rect.height
    print(f"page {page_idx} size: {pw:.1f} x {ph:.1f}")
    links = page.get_links()
    print(f"{len(links)} links on this page")
    for i, link in enumerate(links):
        r = link.get("from")
        uri = link.get("uri") or link.get("page") or ""
        if r is None:
            print(f"[{i}] (no rect) {uri}")
            continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        print(f"[{i}] x0={r.x0:6.1f} y0={r.y0:6.1f} x1={r.x1:6.1f} y1={r.y1:6.1f}  cx={cx:6.1f} cy={cy:6.1f}  {uri}")
    doc.close()


if __name__ == "__main__":
    main()
