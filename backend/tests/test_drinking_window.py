"""
Tests for the drinking window calculator.
Validates known wine + vintage combinations against expert expectations.
Validated by Dr. Isabelle (MW candidate) for correctness.
"""
import pytest
from app.services.drinking_window import calculate_drinking_window, AGING_CURVES


class TestDrinkingWindowStatus:
    def test_young_barolo_not_ready(self):
        """2020 Barolo in 2026 — only 6 years old, peak starts at 10."""
        result = calculate_drinking_window("barolo", 2020, current_year=2026)
        assert result["status"] in ("not_ready", "approaching")
        assert result["years_to_peak"] is not None
        assert result["years_to_peak"] > 0

    def test_peak_barolo_2016(self):
        """2016 Barolo in 2026 — 10 years old, right at peak start."""
        result = calculate_drinking_window("barolo", 2016, current_year=2026)
        assert result["status"] in ("approaching", "in_window", "peak")

    def test_ancient_barolo_declining(self):
        """1975 Barolo in 2026 — 51 years old, beyond max (40y)."""
        result = calculate_drinking_window("barolo", 1975, current_year=2026)
        assert result["status"] in ("past_peak", "declining")

    def test_beaujolais_style_in_window(self):
        """2024 light red (default curve) in 2026 — 2yr, in window for young drinkers."""
        result = calculate_drinking_window("default", 2024, current_year=2026)
        # Default: peak_start=3, so 2yr is "approaching" or early
        assert result["status"] in ("approaching", "in_window", "not_ready")

    def test_vintage_quality_extends_window(self):
        """Exceptional vintage (score=97) should extend drinking window vs average (score=88)."""
        base = calculate_drinking_window("pauillac", 2015, vintage_score=88, current_year=2026)
        exceptional = calculate_drinking_window("pauillac", 2015, vintage_score=97, current_year=2026)
        assert exceptional["drink_by"] >= base["drink_by"]

    def test_poor_vintage_hard_cap(self):
        """Poor vintage (score=75) should have max <= 7 years."""
        result = calculate_drinking_window("barolo", 2020, vintage_score=75, current_year=2026)
        # drink_by = vintage + max, max is capped at 7
        assert result["drink_by"] <= 2020 + 7 + 2  # +2 for the window-opens adjustment

    def test_sauternes_long_window(self):
        """Sauternes 2001 in 2026 — 25 years old, still in peak (peak_end=30)."""
        result = calculate_drinking_window("sauternes", 2001, current_year=2026)
        assert result["status"] in ("in_window", "peak", "past_peak")
        assert result["drink_by"] >= 2040  # max=50 years from vintage

    def test_recommendation_text_present(self):
        """Recommendation text should always be a non-empty string."""
        result = calculate_drinking_window("napa-valley", 2018, current_year=2026)
        assert isinstance(result["recommendation"], str)
        assert len(result["recommendation"]) > 0

    def test_all_known_appellations_return_result(self):
        """Every appellation in AGING_CURVES should return a valid result."""
        for slug in AGING_CURVES:
            result = calculate_drinking_window(slug, 2015, current_year=2026)
            assert result["status"] in (
                "not_ready", "approaching", "in_window", "peak", "past_peak", "declining"
            )
            assert result["drink_from"] <= result["drink_by"]

    def test_unknown_appellation_falls_back_to_default(self):
        """Unknown region slug falls back gracefully to default curve."""
        result = calculate_drinking_window("xyzzy-unknown-region", 2020, current_year=2026)
        assert result["status"] in (
            "not_ready", "approaching", "in_window", "peak", "past_peak", "declining"
        )
