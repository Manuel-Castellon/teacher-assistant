# Curriculum Data — Fetch Instructions

**Target**: Parse these Ministry PDFs into JSON matching `src/types/curriculum.ts`.
**Curriculum version**: תשפ"ו (2025-2026) — always the primary source.

## URLs to Fetch

### Middle School (חטיבת ביניים)
Called "פריסת הוראה" — published every summer.
```
https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tashpav/prisa.pdf
```
Contains: full topic list + recommended hour allocation per topic.
Note: hour allocation is Ministry guidance, actual pace varies per teacher and school.

### High School — 5 יח"ל (3 parts, one per year)
```
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/yod5.pdf    (year 10 — כיתה י')
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/yodalef5.pdf (year 11 — כיתה יא')
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/yodbet5.pdf  (year 12 — כיתה יב')
```

## Annual Focus Documents
At the start of each school year the Ministry publishes a minimum focus document.
During emergencies (war, COVID) an additional focus document is published.
Search: `meyda.education.gov.il מיקוד מתמטיקה תשפ"ו` to find current year's focus.

## Output Format
Parse each PDF into a JSON file matching `CurriculumUnit` from `src/types/curriculum.ts`:
- `data/curriculum/middle-school-tashpav.json`
- `data/curriculum/high-school-5units-year10.json`
- `data/curriculum/high-school-5units-year11.json`
- `data/curriculum/high-school-5units-year12.json`

## Notes
- PDFs are Hebrew, RTL
- Topic IDs should be stable slugs, e.g. `pythagoras-theorem`, `functions-intro`
- Set `parsedAt` to today's ISO date
- Set `sourceUrl` to the PDF URL
- **MVP 1 is BLOCKED until these files exist** — lesson plan generator needs curriculum context
