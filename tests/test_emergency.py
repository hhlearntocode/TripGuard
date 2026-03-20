import pytest
from backend.data.emergency import EMERGENCY_SCRIPTS


EXPECTED_SCENARIOS = ["police_stop", "visa_overstay", "drone_confiscated", "drug_test_positive"]


def test_all_scenarios_present():
    for scenario in EXPECTED_SCENARIOS:
        assert scenario in EMERGENCY_SCRIPTS, f"Missing scenario: {scenario}"


def test_each_scenario_has_title():
    for key, script in EMERGENCY_SCRIPTS.items():
        assert "title" in script, f"Missing title in {key}"
        assert isinstance(script["title"], str)
        assert len(script["title"]) > 0


def test_each_scenario_has_nonempty_steps():
    for key, script in EMERGENCY_SCRIPTS.items():
        assert "steps" in script, f"Missing steps in {key}"
        assert isinstance(script["steps"], list)
        assert len(script["steps"]) > 0, f"Empty steps in {key}"
        for step in script["steps"]:
            assert isinstance(step, str) and len(step) > 0


def test_each_scenario_has_hotlines():
    for key, script in EMERGENCY_SCRIPTS.items():
        assert "hotlines" in script, f"Missing hotlines in {key}"
        assert isinstance(script["hotlines"], dict)


def test_police_stop_mentions_fine():
    steps = EMERGENCY_SCRIPTS["police_stop"]["steps"]
    combined = " ".join(steps)
    assert "4,000,000" in combined


def test_visa_overstay_mentions_fine():
    steps = EMERGENCY_SCRIPTS["visa_overstay"]["steps"]
    combined = " ".join(steps)
    assert "500,000" in combined


def test_drug_scenario_no_external_calls():
    # Emergency scripts must be hardcoded — no API references
    script = EMERGENCY_SCRIPTS["drug_test_positive"]
    combined = " ".join(script["steps"])
    assert "api" not in combined.lower()
    assert "http" not in combined.lower()
