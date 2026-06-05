#!/usr/bin/env python3
"""Convert Barrel Race America text exports to CSV or JSON.

Example:
  python3 tools/parse_bra_results.py data-raw/6-3-2026.txt \
    --event "Summer Barrel Series #2" \
    --venue "Boand Arena" \
    --csv data-raw/6-3-2026.csv \
    --json data-raw/6-3-2026.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime
from pathlib import Path


HEADER_RE = re.compile(r"Show Date:\s*(?P<date>\d{2}/\d{2}/\d{2})")
DIVISION_RE = re.compile(r"^\s*(?P<division>\dD) Placings\s*$")
RESULT_RE = re.compile(
    r"^\s*"
    r"(?:(?P<place>\d+)(?:st|nd|rd|th)|(?P<nt>N/T))"
    r"\s+"
    r"(?P<time>\d+\.\d+)"
    r"\s+"
    r"(?:(?:\$\s*(?P<money>\d+(?:\.\d{2})?))\s+)?"
    r"(?P<rider>.+?)"
    r"\s+on\s+"
    r"(?P<horse>.+?)"
    r"\s*$"
)

FIELDS = [
    "event",
    "date",
    "venue",
    "class",
    "rider",
    "horse",
    "division",
    "time",
    "place",
    "money",
]


def parse_date(text: str, fallback: str | None) -> str:
    match = HEADER_RE.search(text)
    if match:
        return datetime.strptime(match.group("date"), "%m/%d/%y").date().isoformat()
    if fallback:
        return datetime.strptime(fallback, "%Y-%m-%d").date().isoformat()
    raise ValueError("Could not find Show Date in the text file. Pass --date YYYY-MM-DD.")


def clean_class_name(title: str) -> str:
    normalized = re.sub(r"\s+", " ", title).strip()
    section_type = ""
    if re.search(r"\bSeries\b", normalized):
        section_type = "Series"
    elif re.search(r"\bJackpot\b\s*$", normalized):
        section_type = "Jackpot"

    class_name = re.sub(r"^(?:BRN4D|USER1|Table 1|\s)+", "", normalized).strip()
    class_name = re.sub(r"^(?:BRN4D\s+)?Jackpot in\s+", "", class_name).strip()
    class_name = re.sub(r"\s+(?:Barrels\s+)?Jackpot\s*$", "", class_name).strip()
    class_name = re.sub(r"\s+Series\s*$", "", class_name).strip()
    class_name = re.sub(r"\s+-\s*$", "", class_name).strip()

    if section_type:
        return f"{class_name} {section_type}"
    return class_name


def is_section_title(line: str) -> bool:
    line = line.strip()
    if not line:
        return False
    metadata_prefixes = (
        "Copyright",
        "Producer:",
        "Contact:",
        "Location:",
        "Paying to",
        "Rider count",
    )
    if line.startswith(metadata_prefixes):
        return False
    return "Jackpot in" in line or "Barrels" in line or "Poles" in line or "Goats" in line


def parse_sections(text: str, event: str, venue: str, date: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    current_class: str | None = None
    current_division: str | None = None

    lines = text.splitlines()
    for index, raw_line in enumerate(lines):
        line = raw_line.rstrip()

        if "Barrel Race America" in line:
            current_division = None
            current_class = None
            for candidate in lines[index + 1 : index + 10]:
                candidate = candidate.strip()
                if is_section_title(candidate):
                    current_class = clean_class_name(candidate)
                    break
            continue

        division_match = DIVISION_RE.match(line)
        if division_match:
            current_division = division_match.group("division")
            continue

        result_match = RESULT_RE.match(line)
        if not result_match or not current_class:
            continue

        place = result_match.group("place")
        rows.append(
            {
                "event": event,
                "date": date,
                "venue": venue,
                "class": current_class,
                "rider": result_match.group("rider").strip(),
                "horse": result_match.group("horse").strip(),
                "division": current_division or "N/T",
                "time": result_match.group("time"),
                "place": int(place) if place else "N/T",
                "money": float(result_match.group("money") or 0),
            }
        )

    return rows


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Barrel Race America text export")
    parser.add_argument("--event", required=True, help='Event name, e.g. "Summer Barrel Series #2"')
    parser.add_argument("--venue", default="Boand Arena", help='Venue name, e.g. "Boand Arena"')
    parser.add_argument("--date", help="Override date as YYYY-MM-DD")
    parser.add_argument("--csv", type=Path, help="CSV output path")
    parser.add_argument("--json", type=Path, help="JSON output path")
    args = parser.parse_args()

    text = args.input.read_text(encoding="utf-8-sig")
    date = parse_date(text, args.date)
    rows = parse_sections(text, args.event, args.venue, date)

    if not rows:
        raise SystemExit("No result rows found. The report format may have changed.")

    csv_path = args.csv or args.input.with_suffix(".csv")
    write_csv(csv_path, rows)

    if args.json:
        write_json(args.json, rows)

    print(f"Parsed {len(rows)} rows")
    print(f"Wrote {csv_path}")
    if args.json:
        print(f"Wrote {args.json}")


if __name__ == "__main__":
    main()
