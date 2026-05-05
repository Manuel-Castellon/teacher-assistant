"""Build CurriculumUnit JSON for middle-school grades 7/8/9 (+ 9-reduced).

Reads the Ministry פריסת הוראה Google-Doc text exports under
data/curriculum/raw/middle-school/, runs parse_spread.parse(), and writes one
CurriculumUnit JSON per grade under data/curriculum/.

Topic IDs are positional (`ms-gradeN-tNN`) for v1; meaningful English slugs
are TODO and noted in `_note`. unitLevels is `[]` for middle school (no יח"ל).
isBagrutTopic is false for all middle-school topics.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running as `python build_middle_school_json.py` without a package install.
sys.path.insert(0, str(Path(__file__).parent))
from parse_spread import parse  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "curriculum" / "raw" / "middle-school"
OUT_DIR = ROOT / "data" / "curriculum"
PARSED_AT = "2026-05-05"
ACADEMIC_YEAR = "תשפ\"ו"

# (grade slug, GradeLevel code, source Google Doc URL)
GRADES = [
    ("grade7", "זי", "https://docs.google.com/document/d/17bGFCtZjygxCWsj3Dya8la4trFfW2QYq/edit?usp=sharing"),
    ("grade8", "חי", "https://docs.google.com/document/d/1l40XxpILIZPGNqPBkCDAfUcJR5Njl1JP/edit?usp=sharing"),
    ("grade9", "טי", "https://docs.google.com/document/d/1mLDtQqvYkOX3tQLdC9AcPVjeC36jodXJzzGP-gZ_0oI/edit?usp=sharing"),
    ("grade9-reduced", "טי", "https://docs.google.com/document/d/1sjF0sQTi9xZeNpDaZ-gOzhqLP4KGRy1Fr5zeCcYC168/edit?usp=sharing"),
]


def build_unit(grade_slug: str, grade_code: str, source_url: str) -> dict:
    spread_path = RAW_DIR / f"{grade_slug}-spread.txt"
    parsed = parse(spread_path)
    topics_in = parsed["topics_aggregated"]
    months_total = sum(m["hours"] or 0 for m in parsed["months"])
    rows_total = parsed["totals"]["hours_from_rows"]

    topics_out = []
    for idx, t in enumerate(topics_in, start=1):
        topic_id = f"ms-{grade_slug}-t{idx:02d}"
        topics_out.append({
            "id": topic_id,
            "name": t["topic"],
            "recommendedHours": t["hours"],
            "gradeLevel": [grade_code],
            "unitLevels": [],
            "isBagrutTopic": False,
            "prerequisites": [],
            "subTopics": [
                {
                    "id": f"{topic_id}-content",
                    "name": "תכנים",
                    "parentTopicId": topic_id,
                    "learningObjectives": [],
                }
            ],
        })

    unit_id = f"ms-{grade_slug}-tashpav"
    note = (
        f"Topics extracted from the פריסת הוראה Google Doc via heuristic parse "
        f"(scripts/parse-curriculum/parse_spread.py). Sum of topic hours = "
        f"{rows_total}h, sum of monthly budgets = {months_total}h; the "
        f"{months_total - rows_total}h gap is mostly Ministry-allocated free / "
        f"חזרות / משימות אוריינות weeks not tied to a specific topic. Topic IDs "
        f"are positional (`tNN`); English slugs and per-topic learning "
        f"objectives are TODO. Raw text dump committed at "
        f"data/curriculum/raw/middle-school/{grade_slug}-spread.txt."
    )

    return {
        "id": unit_id,
        "stage": "חטיבת_ביניים",
        "gradeLevel": grade_code,
        "academicYear": ACADEMIC_YEAR,
        "sourceUrl": source_url,
        "parsedAt": PARSED_AT,
        "_note": note,
        "topics": topics_out,
    }


def main() -> None:
    for grade_slug, grade_code, source_url in GRADES:
        unit = build_unit(grade_slug, grade_code, source_url)
        out_path = OUT_DIR / f"middle-school-{grade_slug}.json"
        out_path.write_text(
            json.dumps(unit, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        topics = len(unit["topics"])
        hours = sum(t["recommendedHours"] for t in unit["topics"])
        print(f"wrote {out_path.name}: {topics} topics, {hours}h")


if __name__ == "__main__":
    main()
