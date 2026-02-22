# ==============================
# CONFIGURATION FILE
# Nurse Rostering Demo Settings
# ==============================

# ==============================
# FTE & Hours
# ==============================

BASE_HOURS_PER_WEEK = 38  # FTE 1.0 = 38 hours per week


# ==============================
# Shift Definitions
# ==============================

SHIFT_HOURS = {
    "AM": 8,
    "PM": 8,
    "NIGHT": 10
}

# (start_hour, end_hour) in 24h format
SHIFT_TIMES = {
    "AM": (7, 15),
    "PM": (15, 23),
    "NIGHT": (23, 7)  # wraps to next day
}


# ==============================
# Coverage Requirements
# ==============================

COVERAGE_REQUIREMENTS = {
    "AM": 6,
    "PM": 6,
    "NIGHT": 4
}


# ==============================
# EBA / Safety Rules
# ==============================

MIN_REST_HOURS = 10
MAX_CONSECUTIVE_NIGHTS = 5


# ==============================
# Optimization Weights
# (Higher = More Important)
# ==============================

WEIGHTS = {
    "overtime": 5,
    "burnout": 3,
    "fairness": 2,
    "preference": 1,
    "change_penalty": 2
}