import pytest
from backend.data.constants import lookup_fine, FINES, IDP_VALIDITY, VISA_FREE_DAYS, EMBASSY_CONTACTS


def test_lookup_fine_motorbike_no_license():
    fine = lookup_fine("no_license", "motorbike")
    assert fine is not None
    assert fine["min"] == 2_000_000
    assert fine["max"] == 4_000_000
    assert "7-day impound" in fine["extra"]


def test_lookup_fine_car_no_license():
    fine = lookup_fine("no_license", "car")
    assert fine is not None
    assert fine["min"] == 10_000_000


def test_lookup_fine_motorbike_red_light():
    fine = lookup_fine("red_light", "motorbike")
    assert fine is not None
    assert fine["min"] == 4_000_000


def test_lookup_fine_no_helmet():
    fine = lookup_fine("no_helmet", "motorbike")
    assert fine is not None
    assert fine["min"] == 400_000


def test_lookup_fine_alcohol_levels():
    l1 = lookup_fine("alcohol_l1", "motorbike")
    l2 = lookup_fine("alcohol_l2", "motorbike")
    l3 = lookup_fine("alcohol_l3", "motorbike")
    assert l1["min"] < l2["min"] < l3["min"]


def test_lookup_fine_drone_basic():
    fine = lookup_fine("drone_no_permit_basic")
    assert fine is not None
    assert fine["min"] == 1_000_000


def test_lookup_fine_drone_serious():
    fine = lookup_fine("drone_no_permit_serious")
    assert fine is not None
    assert fine["max"] == 30_000_000
    assert "confiscated" in fine["extra"]


def test_lookup_fine_visa_overstay():
    fine = lookup_fine("visa_overstay_1_5d")
    assert fine is not None
    assert fine["min"] == 500_000

    fine2 = lookup_fine("visa_overstay_over_30d")
    assert fine2 is not None
    assert "deportation" in fine2["extra"]


def test_lookup_fine_unknown_returns_none():
    assert lookup_fine("nonexistent_violation") is None


def test_lookup_fine_unknown_vehicle_returns_none():
    assert lookup_fine("no_license", "bicycle") is None


def test_idp_validity_structure():
    assert "valid_1968" in IDP_VALIDITY
    assert "invalid_1949" in IDP_VALIDITY
    assert "United States" in IDP_VALIDITY["invalid_1949"]
    assert "Germany" in IDP_VALIDITY["valid_1968"]


def test_visa_free_days():
    assert 45 in VISA_FREE_DAYS
    assert "United States" in VISA_FREE_DAYS[0]
    assert "Germany" in VISA_FREE_DAYS[45]


def test_embassy_contacts():
    assert "United States" in EMBASSY_CONTACTS
    assert EMBASSY_CONTACTS["United States"].startswith("+84")
