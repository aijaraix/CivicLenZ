#!/usr/bin/env python3
"""Enumerate Florida expected seats from known counts and the county registry.

This catalog does not invent municipal, school, judicial, special-district, or
county-commission seat counts. Those families are coverage gaps with
expected_count_unknown.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from workers.seats.ids import (
    coverage_gap_id,
    jurisdiction_id_for_key,
    queue_style_seat_key,
    seat_id_for_key,
    slugify,
)

ROOT = Path(__file__).resolve().parents[2]
COUNTY_REGISTRY_PATH = ROOT / "data" / "sources" / "florida-county-source-registry.json"
RESEARCH_CONTRACTS = {
    "federal_executive": "us-federal-executive",
    "us_legislator": "us-legislator",
    "statewide_executive": "florida-statewide-executive",
    "state_legislator": "florida-state-legislator",
    "county_constitutional_officer": "florida-county-constitutional-officer",
}

CONSTITUTIONAL_OFFICES: tuple[tuple[str, str], ...] = (
    ("sheriff", "Sheriff"),
    ("clerk_of_circuit_court_and_comptroller", "Clerk of the Circuit Court and Comptroller"),
    ("supervisor_of_elections", "Supervisor of Elections"),
    ("tax_collector", "Tax Collector"),
    ("property_appraiser", "Property Appraiser"),
)

COVERAGE_GAP_FAMILIES: tuple[tuple[str, str, str], ...] = (
    ("county_commission", "county", "County commission"),
    ("school_district", "school_district", "School district elected seats"),
    ("municipal", "municipal", "Municipal elected seats"),
    ("judicial", "judicial", "Judicial elected or retention seats"),
    ("special_district", "special_district", "Special-district elected seats"),
)

SOUTH_FLORIDA_COUNTIES = {
    "Miami-Dade": "miami_dade",
    "Broward": "broward",
    "Palm Beach": "palm_beach",
}

US_JURISDICTION_ID = jurisdiction_id_for_key("us")
FLORIDA_JURISDICTION_ID = jurisdiction_id_for_key("FL")


def load_counties(path: Path = COUNTY_REGISTRY_PATH) -> list[str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    counties = payload.get("counties")
    if not isinstance(counties, list) or len(counties) != 67:
        raise RuntimeError("florida-county-source-registry.json must list exactly 67 counties.")
    return [str(name) for name in counties]


def county_region(county: str) -> str:
    return SOUTH_FLORIDA_COUNTIES.get(county, "remaining")


def county_jurisdiction_id(county: str) -> str:
    return jurisdiction_id_for_key(f"FL-county-{slugify(county)}")


def monitoring_template() -> dict[str, Any]:
    return {
        "active": False,
        "occupancyCheckClass": "manual",
        "lastCheckedAt": None,
        "lastChangedAt": None,
        "nextScheduledCheckAt": None,
        "changeReason": None,
    }


def expected_seat(
    *,
    seat_key_value: str,
    seat_name: str,
    office_type: str,
    government_level: str,
    jurisdiction_id: str,
    jurisdiction_name: str,
    research_contract_key: str,
    discovery_status: str,
    branch: str | None = None,
    chamber: str | None = None,
    district_number: str | None = None,
    seat_at_large: bool | None = None,
    coverage_region: str = "statewide",
    state_code: str | None = "FL",
    source_urls: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "schemaVersion": "1.0.0",
        "seatId": seat_id_for_key(seat_key_value),
        "seatKey": seat_key_value,
        "seatName": seat_name,
        "officeType": office_type,
        "governmentLevel": government_level,
        "branch": branch,
        "chamber": chamber,
        "jurisdictionId": jurisdiction_id,
        "jurisdictionName": jurisdiction_name,
        "stateCode": state_code,
        "districtName": f"District {district_number}" if district_number else jurisdiction_name,
        "districtNumber": district_number,
        "seatAtLarge": seat_at_large,
        "occupancyStatus": "unknown",
        "currentTermId": None,
        "currentPersonId": None,
        "termHistoryIds": [],
        "sourceUrls": source_urls or [],
        "evidenceIds": [],
        "monitoring": monitoring_template(),
        "researchContractKey": research_contract_key,
        "ledgerStatus": "expected",
        "discoveryStatus": discovery_status,
        "occupancyVerificationStatus": "UNKNOWN",
        "coverageRegion": coverage_region,
    }


def federal_expected_seats() -> list[dict[str, Any]]:
    seats = [
        expected_seat(
            seat_key_value="fl-president-of-the-united-states-at-large",
            seat_name="President of the United States",
            office_type="president",
            government_level="federal",
            jurisdiction_id=US_JURISDICTION_ID,
            jurisdiction_name="United States",
            research_contract_key=RESEARCH_CONTRACTS["federal_executive"],
            discovery_status="declared_from_count",
            branch="executive",
            seat_at_large=True,
            coverage_region="national",
            source_urls=["https://www.whitehouse.gov/administration/"],
        ),
        expected_seat(
            seat_key_value="fl-vice-president-of-the-united-states-at-large",
            seat_name="Vice President of the United States",
            office_type="vice_president",
            government_level="federal",
            jurisdiction_id=US_JURISDICTION_ID,
            jurisdiction_name="United States",
            research_contract_key=RESEARCH_CONTRACTS["federal_executive"],
            discovery_status="declared_from_count",
            branch="executive",
            seat_at_large=True,
            coverage_region="national",
            source_urls=["https://www.whitehouse.gov/administration/"],
        ),
    ]
    for seat_number in (1, 2):
        seats.append(
            expected_seat(
                seat_key_value=f"fl-united-states-senator-{seat_number}",
                seat_name=f"United States Senator from Florida (Seat {seat_number})",
                office_type="us_senator",
                government_level="federal",
                jurisdiction_id=FLORIDA_JURISDICTION_ID,
                jurisdiction_name="Florida",
                research_contract_key=RESEARCH_CONTRACTS["us_legislator"],
                discovery_status="declared_from_count",
                branch="legislative",
                chamber="senate",
                seat_at_large=True,
                coverage_region="statewide",
                source_urls=["https://www.senate.gov/senators/"],
            )
        )
    for district in range(1, 29):
        seats.append(
            expected_seat(
                seat_key_value=queue_style_seat_key("United States Representative", str(district)),
                seat_name=f"United States Representative, Florida District {district}",
                office_type="us_representative",
                government_level="federal",
                jurisdiction_id=FLORIDA_JURISDICTION_ID,
                jurisdiction_name="Florida",
                research_contract_key=RESEARCH_CONTRACTS["us_legislator"],
                discovery_status="declared_from_count",
                branch="legislative",
                chamber="house",
                district_number=str(district),
                seat_at_large=False,
                coverage_region="statewide",
                source_urls=["https://www.house.gov/representatives"],
            )
        )
    return seats


def statewide_expected_seats() -> list[dict[str, Any]]:
    executives = (
        ("Governor of Florida", "governor"),
        ("Lieutenant Governor of Florida", "lieutenant_governor"),
        ("Attorney General of Florida", "attorney_general"),
        ("Chief Financial Officer of Florida", "chief_financial_officer"),
        ("Commissioner of Agriculture of Florida", "commissioner_of_agriculture"),
    )
    seats = [
        expected_seat(
            seat_key_value=queue_style_seat_key(title, None),
            seat_name=title,
            office_type=office_type,
            government_level="state",
            jurisdiction_id=FLORIDA_JURISDICTION_ID,
            jurisdiction_name="Florida",
            research_contract_key=RESEARCH_CONTRACTS["statewide_executive"],
            discovery_status="declared_from_count",
            branch="executive",
            seat_at_large=True,
            coverage_region="statewide",
        )
        for title, office_type in executives
    ]
    for district in range(1, 41):
        title = f"Florida State Senator, District {district}"
        seats.append(
            expected_seat(
                seat_key_value=queue_style_seat_key(title, str(district)),
                seat_name=title,
                office_type="state_senator",
                government_level="state",
                jurisdiction_id=FLORIDA_JURISDICTION_ID,
                jurisdiction_name="Florida",
                research_contract_key=RESEARCH_CONTRACTS["state_legislator"],
                discovery_status="declared_from_count",
                branch="legislative",
                chamber="senate",
                district_number=str(district),
                seat_at_large=False,
                coverage_region="statewide",
                source_urls=["https://www.flsenate.gov/Senators"],
            )
        )
    for district in range(1, 121):
        title = f"Florida State Representative, District {district}"
        seats.append(
            expected_seat(
                seat_key_value=queue_style_seat_key(title, str(district)),
                seat_name=title,
                office_type="state_representative",
                government_level="state",
                jurisdiction_id=FLORIDA_JURISDICTION_ID,
                jurisdiction_name="Florida",
                research_contract_key=RESEARCH_CONTRACTS["state_legislator"],
                discovery_status="declared_from_count",
                branch="legislative",
                chamber="house",
                district_number=str(district),
                seat_at_large=False,
                coverage_region="statewide",
                source_urls=["https://www.myfloridahouse.gov/Sections/Representatives/representatives.aspx"],
            )
        )
    return seats


def county_constitutional_expected_seats(counties: Iterable[str] | None = None) -> list[dict[str, Any]]:
    seats: list[dict[str, Any]] = []
    for county in counties or load_counties():
        for office_type, title in CONSTITUTIONAL_OFFICES:
            office_title = f"{county} County {title}"
            seats.append(
                expected_seat(
                    seat_key_value=queue_style_seat_key(office_title, None),
                    seat_name=office_title,
                    office_type=office_type,
                    government_level="county",
                    jurisdiction_id=county_jurisdiction_id(county),
                    jurisdiction_name=f"{county} County",
                    research_contract_key=RESEARCH_CONTRACTS["county_constitutional_officer"],
                    discovery_status="declared_from_registry",
                    branch="executive",
                    seat_at_large=True,
                    coverage_region=county_region(county),
                    state_code="FL",
                )
            )
    return seats


def coverage_gaps(counties: Iterable[str] | None = None) -> list[dict[str, Any]]:
    gaps: list[dict[str, Any]] = []
    for county in counties or load_counties():
        for office_family, government_level, label in COVERAGE_GAP_FAMILIES:
            gap_key = slugify(f"fl-{county}-county-{office_family}")
            gaps.append(
                {
                    "schemaVersion": "1.0.0",
                    "coverageGapId": coverage_gap_id(gap_key),
                    "gapKey": gap_key,
                    "jurisdictionName": f"{county} County",
                    "stateCode": "FL",
                    "governmentLevel": government_level,
                    "officeFamily": office_family,
                    "expectedCountStatus": "expected_count_unknown",
                    "expectedCount": None,
                    "reason": (
                        f"{label} counts for {county} County are not declared as expected seats. "
                        "County commission district counts vary; municipal, school, judicial, and "
                        "special-district inventories are not invented."
                    ),
                    "coverageRegion": county_region(county),
                    "ledgerStatus": "coverage_gap",
                }
            )
    return gaps


def all_expected_seats(counties: Iterable[str] | None = None) -> list[dict[str, Any]]:
    seats = federal_expected_seats() + statewide_expected_seats() + county_constitutional_expected_seats(counties)
    keys = [seat["seatKey"] for seat in seats]
    if len(keys) != len(set(keys)):
        raise RuntimeError("Expected seat catalog produced duplicate seatKey values.")
    return seats


def expected_count_summary(counties: Iterable[str] | None = None) -> dict[str, int]:
    county_list = list(counties or load_counties())
    return {
        "usPresident": 1,
        "usVicePresident": 1,
        "floridaUsSenate": 2,
        "floridaUsHouse": 28,
        "floridaStatewideExecutive": 5,
        "floridaSenate": 40,
        "floridaHouse": 120,
        "counties": len(county_list),
        "countyConstitutionalOfficesPerCounty": 5,
        "countyConstitutionalSeats": len(county_list) * 5,
        "expectedSeats": 1 + 1 + 2 + 28 + 5 + 40 + 120 + (len(county_list) * 5),
        "coverageGapRows": len(county_list) * len(COVERAGE_GAP_FAMILIES),
    }
