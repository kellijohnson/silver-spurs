#!/usr/bin/env python3
"""Convert an edited results CSV into site results JSON.

Example:
  python3 tools/csv_to_results_json.py data-raw/6-3-2026.csv \
    --json data-raw/6-3-2026-reviewed.json
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


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


def clean_row(row: dict[str, str]) -> dict[str, object]:
    cleaned: dict[str, object] = {}
    for field in FIELDS:
        value = (row.get(field) or "").strip()
        if field == "place":
            cleaned[field] = int(value) if value.isdigit() else value
        elif field == "money":
            cleaned[field] = float(value or 0)
        else:
            cleaned[field] = value
    return cleaned


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Reviewed results CSV")
    parser.add_argument("--json", type=Path, required=True, help="JSON output path")
    args = parser.parse_args()

    with args.csv.open(newline="", encoding="utf-8-sig") as file:
        rows = [clean_row(row) for row in csv.DictReader(file)]

    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} rows to {args.json}")


if __name__ == "__main__":
    main()
