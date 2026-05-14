"""Parse a Ministry פריסת הוראה Google-Doc text export into topic rows.

Usage: .venv/bin/python parse_spread.py <input.txt>
Prints a JSON object: { months: [...], topics_aggregated: [...], rows: [...] }

The Doc table flattens to text where each table cell starts with '\\t'.
A topic row repeats every 6 cells: month / domain / hours / topic / detail / notes.
Month is only filled on the first row of a new month; later rows in the same
month inherit it. Lines without a leading tab are either multi-line cell
continuations or in-cell sub-headers like "חומרי למידה" / "משימות אוריינות";
we ignore them for the spine extraction (we only need domain/hours/topic).

Heuristic walk:
  1. Scan for month markers (lines naming a Hebrew month) — capture the
     "<N> שעות" line that follows for the per-month budget.
  2. Scan for domain markers ("\\tתחום X" or just "\\tX" where X ∈ {אלגברי,
     גאומטרי, מספרי}). For each, the NEXT '\\t<int>' line is the hours and the
     NEXT '\\t<non-empty text>' line after that is the topic name.
  3. Aggregate hours by topic name (sum across months).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HEBREW_MONTHS = {
    "ספטמבר", "אוקטובר", "נובמבר", "דצמבר", "ינואר", "פברואר",
    "מרץ", "אפריל", "מאי", "יוני",
}

DOMAIN_BARE = {"אלגברי", "גאומטרי", "מספרי", "הסתברות", "סטטיסטיקה"}

# Column headers that look like domains but aren't.
NON_DOMAIN_HEADERS = {"תחום לימודי"}

# Header markers signalling we're still in the column-header band; once we see
# "הערות" alone in a tab-cell we know real data starts on the next month line.
HEADER_END_MARKERS = {"פירוט הנושא", "הערות"}

NOISE_MARKERS = {"חומרי למידה נוספים", "חומרי למידה", "משימות אוריינות לביצוע", "משימות אוריינות"}


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def is_domain(text: str) -> bool:
    s = normalize_ws(text)
    if s in NON_DOMAIN_HEADERS:
        return False
    if s.startswith("תחום "):
        return True
    return s in DOMAIN_BARE


def parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8-sig")
    lines = [ln.rstrip("\r\n") for ln in raw.split("\n")]

    months: list[dict] = []
    rows: list[dict] = []
    current_month: str | None = None
    in_data = False  # only True once we've passed the column-header band

    i = 0
    while i < len(lines):
        ln = lines[i]
        stripped = ln.strip()

        # Detect end of column-header band. After we see "הערות" or "פירוט הנושא"
        # as a standalone tab-cell, the next month name starts real data.
        if not in_data and ln.startswith("\t") and normalize_ws(stripped) in HEADER_END_MARKERS:
            in_data = True
            i += 1
            continue
        if not in_data:
            i += 1
            continue

        # Month header: bare line naming a Hebrew month.
        if stripped in HEBREW_MONTHS or (ln.startswith("\t") and stripped in HEBREW_MONTHS):
            current_month = stripped
            # Look ahead a few lines for "<N> שעות" budget line.
            budget = None
            for j in range(i + 1, min(i + 4, len(lines))):
                m = re.match(r"^\s*(\d+)\s*שעות\s*$", lines[j])
                if m:
                    budget = int(m.group(1))
                    break
            months.append({"month": current_month, "hours": budget})
            i += 1
            continue

        # Domain marker (must be tab-prefixed cell).
        if ln.startswith("\t") and is_domain(stripped):
            domain = normalize_ws(stripped)
            # Find next tab-prefixed integer (hours).
            hours = None
            j = i + 1
            while j < len(lines):
                lj = lines[j]
                if lj.startswith("\t"):
                    m = re.match(r"^\s*(\d+)\s*$", lj.strip())
                    if m:
                        hours = int(m.group(1))
                        break
                j += 1
            # Find next tab-prefixed non-numeric, non-domain text (topic name).
            topic = None
            k = j + 1 if hours is not None else i + 1
            while k < len(lines):
                lk = lines[k]
                if lk.startswith("\t"):
                    s = normalize_ws(lk.strip())
                    if s and not re.match(r"^\d+$", s) and not is_domain(s):
                        # Trim a single trailing comma (Ministry inconsistency).
                        topic = s.rstrip(",").strip()
                        break
                k += 1
            if hours is not None and topic:
                # Collect detail lines after the topic until the next structural marker.
                details: list[str] = []
                d = k + 1
                while d < len(lines):
                    ld = lines[d]
                    sd = normalize_ws(ld.strip())
                    if not sd:
                        d += 1
                        continue
                    if sd in HEBREW_MONTHS or is_domain(sd):
                        break
                    if sd in NOISE_MARKERS:
                        d += 1
                        continue
                    if re.match(r"^\d+\s*שעות\s*$", sd):
                        break
                    if sd and sd not in NON_DOMAIN_HEADERS and sd not in HEADER_END_MARKERS:
                        details.append(sd)
                    d += 1
                rows.append({
                    "month": current_month,
                    "domain": domain,
                    "hours": hours,
                    "topic": topic,
                    "details": details,
                })
                i = k + 1
                continue
        i += 1

    # Aggregate hours by topic name.
    agg: dict[str, dict] = {}
    for r in rows:
        a = agg.setdefault(r["topic"], {"topic": r["topic"], "hours": 0, "domains": set(), "occurrences": 0, "details": []})
        a["hours"] += r["hours"]
        a["domains"].add(r["domain"])
        a["occurrences"] += 1
        a["details"].extend(r.get("details", []))
    topics = [
        {"topic": v["topic"], "hours": v["hours"], "domains": sorted(v["domains"]), "occurrences": v["occurrences"], "details": v["details"]}
        for v in agg.values()
    ]
    topics.sort(key=lambda t: -t["hours"])

    return {
        "months": months,
        "topics_aggregated": topics,
        "rows": rows,
        "totals": {
            "rows": len(rows),
            "topics": len(topics),
            "hours_from_rows": sum(r["hours"] for r in rows),
            "hours_from_months": sum(m["hours"] or 0 for m in months),
        },
    }


def main() -> None:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <input.txt>", file=sys.stderr)
        sys.exit(2)
    p = Path(sys.argv[1]).resolve()
    if not p.exists():
        print(f"not found: {p}", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(parse(p), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
