FINES = {
    "traffic": {
        "motorbike": {
            "no_license":    {"min": 2_000_000,  "max": 4_000_000,  "extra": "7-day impound",
                              "source": "NĐ 168/2024/NĐ-CP Điều 5"},
            "red_light":     {"min": 4_000_000,  "max": 6_000_000,  "extra": None,
                              "source": "NĐ 168/2024/NĐ-CP"},
            "no_helmet":     {"min": 400_000,    "max": 600_000,    "extra": None,
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l1":    {"min": 2_000_000,  "max": 3_000_000,  "extra": "license suspended 10-12m",
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l2":    {"min": 6_000_000,  "max": 8_000_000,  "extra": "license suspended 16-18m",
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l3":    {"min": 10_000_000, "max": 14_000_000, "extra": "license suspended 22-24m",
                              "source": "NĐ 168/2024/NĐ-CP"},
        },
        "car": {
            "no_license":    {"min": 10_000_000, "max": 12_000_000, "extra": None,
                              "source": "NĐ 168/2024/NĐ-CP"},
            "red_light":     {"min": 18_000_000, "max": 20_000_000, "extra": "4 points deducted",
                              "source": "NĐ 168/2024/NĐ-CP"},
            "alcohol_l3":    {"min": 30_000_000, "max": 40_000_000, "extra": "license revoked",
                              "source": "NĐ 168/2024/NĐ-CP"},
        },
    },
    "drone": {
        "no_permit_basic":   {"min": 1_000_000,  "max": 2_000_000,  "extra": None,
                              "source": "NĐ 288/2025/NĐ-CP"},
        "no_permit_serious": {"min": 20_000_000, "max": 30_000_000, "extra": "device confiscated",
                              "source": "NĐ 288/2025/NĐ-CP"},
    },
    "visa": {
        "overstay_1_5d":     {"min": 500_000,    "max": 1_500_000,  "extra": None,
                              "source": "NĐ 07/2023/NĐ-CP"},
        "overstay_6_10d":    {"min": 1_500_000,  "max": 3_000_000,  "extra": None,
                              "source": "NĐ 07/2023/NĐ-CP"},
        "overstay_over_30d": {"min": 15_000_000, "max": 25_000_000, "extra": "deportation + 1-3yr ban",
                              "source": "NĐ 07/2023/NĐ-CP"},
    },
}

IDP_VALIDITY = {
    "valid_1968":   ["Germany","France","United Kingdom","Italy","Spain","Netherlands",
                     "Belgium","Poland","Czech Republic","Sweden","Norway","Finland",
                     "Denmark","Switzerland","Austria","Portugal","Russia","Ukraine"],
    "invalid_1949": ["United States","Australia","Canada","New Zealand","India"],
    "asean_valid":  ["Thailand","Philippines","Indonesia","Malaysia","Singapore",
                     "Cambodia","Laos","Myanmar","Brunei"],
    "bilateral":    ["Japan","South Korea"],
}

VISA_FREE_DAYS = {
    45: ["Germany","France","United Kingdom","Italy","Spain","Russia","Japan","South Korea",
         "Australia","Denmark","Sweden","Norway","Finland","Switzerland","Poland","Czech Republic"],
    30: ["Thailand","Malaysia","Singapore","Indonesia","Philippines"],
    0:  ["United States","Canada","India","China"],
}

EMBASSY_CONTACTS = {
    "United States":  "+84 24 3850 5000",
    "Germany":        "+84 24 3845 3836",
    "France":         "+84 24 3944 5700",
    "Australia":      "+84 24 3774 0100",
    "United Kingdom": "+84 24 3936 0500",
    "Japan":          "+84 24 3846 3000",
    "South Korea":    "+84 24 3831 5110",
}


def lookup_fine(violation: str, vehicle: str = "motorbike") -> dict | None:
    if violation.startswith("drone"):
        key = violation.replace("drone_", "")
        return FINES["drone"].get(key)
    if violation.startswith("visa"):
        key = violation.replace("visa_", "")
        return FINES["visa"].get(key)
    return FINES["traffic"].get(vehicle, {}).get(violation)
