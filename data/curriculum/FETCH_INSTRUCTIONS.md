# Curriculum Data — Fetch Instructions

**Target**: Parse Ministry sources into JSON matching `src/types/curriculum.ts`.
**Curriculum version**: תשפ"ו (2025-2026) — always the primary source.

## URLs to Fetch

### Middle School (חטיבת ביניים)
The Ministry's `prisa.pdf` is a **portal**, not content. Page 1 holds a 4-grade × 5-column table of links to ~20 Google Docs. Hour allocations and topic detail live in the linked Docs, not in `prisa.pdf` itself.

```
https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tashpav/prisa.pdf
```

Of the 5 columns (תכנית הוראה Hebrew/Arabic, פריסת הוראה Hebrew/Arabic, פריסת עמ"ט), the **תכנית הוראה Hebrew** docs are private (401 from `/export?format=txt`) but the **פריסת הוראה Hebrew** docs are publicly fetchable for all 4 grades. The spread (`פריסת הוראה`) is also the richer source: month-by-month breakdown, hours per topic, learning materials, teaching notes.

Doc IDs we use (extracted via `scripts/parse-curriculum/dump_links.py` on prisa.pdf):

| Grade | Doc ID |
|-------|--------|
| ז' (7) | `17bGFCtZjygxCWsj3Dya8la4trFfW2QYq` |
| ח' (8) | `1l40XxpILIZPGNqPBkCDAfUcJR5Njl1JP` |
| ט' (9) | `1mLDtQqvYkOX3tQLdC9AcPVjeC36jodXJzzGP-gZ_0oI` |
| ט' רמה מצומצמת | `1sjF0sQTi9xZeNpDaZ-gOzhqLP4KGRy1Fr5zeCcYC168` |

Fetch with: `curl -sSL "https://docs.google.com/document/d/<id>/export?format=txt"`. Local copies live under `data/curriculum/raw/middle-school/`.

**Caveat**: the Doc URLs in `prisa.pdf` carry individual-account `ouid` parameters, so Ministry could revoke link access without rotating `prisa.pdf`. The committed `.txt` exports under `raw/middle-school/` are the local receipt.

### High School — 5 יח"ל (3 parts, one per year)
```
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/yod5.pdf    (year 10 — כיתה י')
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/yodalef5.pdf (year 11 — כיתה יא')
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/yodbet5.pdf  (year 12 — כיתה יב')
```
These are direct PDF content (not portals). Parse via `scripts/parse-curriculum/extract_text.py`.

## Annual Focus Documents
At the start of each school year the Ministry publishes a minimum focus document.
During emergencies (war, COVID) an additional focus document is published.
Search: `meyda.education.gov.il מיקוד מתמטיקה תשפ"ו` to find current year's focus.

## Output Format
Parse each source into JSON matching `CurriculumUnit` from `src/types/curriculum.ts`:
- `data/curriculum/middle-school-grade7.json`
- `data/curriculum/middle-school-grade8.json`
- `data/curriculum/middle-school-grade9.json`
- `data/curriculum/middle-school-grade9-reduced.json`
- `data/curriculum/high-school-5units-year10.json`
- `data/curriculum/high-school-5units-year11.json`
- `data/curriculum/high-school-5units-year12.json`

Validate after every regen:
```
npx tsx scripts/parse-curriculum/validate.ts
```

## Notes
- Sources are Hebrew, RTL
- Topic IDs in committed JSON: high-school uses meaningful English slugs (`pythagoras-theorem`); middle-school is currently positional (`ms-grade7-t01`) pending an English-slug pass
- Middle-school topic hours don't sum to the monthly budget — Ministry leaves free / חזרות / משימות אוריינות weeks unscheduled. The gap is documented per-grade in each JSON's `_note`.
- Set `parsedAt` to today's ISO date; `sourceUrl` to the upstream URL (PDF for high school, Google Doc for middle school)
- **MVP 1 is BLOCKED until these files exist** — lesson plan generator needs curriculum context
