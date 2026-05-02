#!/usr/bin/env python3
"""
Validate grape varietal reference data.
Grapes are stored as JSONB in wine.primary_grapes — no separate table in Phase 1.
This script validates the JSON schema.

Usage: python -m scripts.seed_grapes
"""
import json
import sys
from pathlib import Path

data_path = Path(__file__).parent.parent / "data" / "grape_varietals.json"

def validate_grapes() -> None:
    varietals = json.loads(data_path.read_text())
    required_fields = {"name", "color", "origin_country"}
    errors = []
    for i, grape in enumerate(varietals):
        missing = required_fields - set(grape.keys())
        if missing:
            errors.append(f"  [{i}] {grape.get('name', '???')}: missing {missing}")
        if grape.get("color") not in ("red", "white", "pink", "gray"):
            errors.append(f"  [{i}] {grape['name']}: invalid color '{grape.get('color')}'")
    if errors:
        print(f"Validation FAILED ({len(errors)} errors):")
        for e in errors:
            print(e)
        sys.exit(1)
    print(f"Validated {len(varietals)} grape varietals — all OK.")

if __name__ == "__main__":
    validate_grapes()
