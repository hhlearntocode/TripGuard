export const IDP_VALIDITY: Record<string, string[]> = {
  valid_1968: [
    "Germany", "France", "United Kingdom", "Italy", "Spain", "Netherlands",
    "Belgium", "Poland", "Czech Republic", "Sweden", "Norway", "Finland",
    "Denmark", "Switzerland", "Austria", "Portugal", "Russia", "Ukraine",
  ],
  invalid_1949: ["United States", "Australia", "Canada", "New Zealand", "India"],
  asean_valid: [
    "Thailand", "Philippines", "Indonesia", "Malaysia", "Singapore",
    "Cambodia", "Laos", "Myanmar", "Brunei",
  ],
  bilateral: ["Japan", "South Korea"],
};

export const VISA_FREE_DAYS: Record<number, string[]> = {
  45: [
    "Germany", "France", "United Kingdom", "Italy", "Spain", "Russia",
    "Japan", "South Korea", "Australia", "Denmark", "Sweden", "Norway",
    "Finland", "Switzerland", "Poland", "Czech Republic",
  ],
  30: ["Thailand", "Malaysia", "Singapore", "Indonesia", "Philippines"],
  0: ["United States", "Canada", "India", "China"],
};

export const DRONE_WEIGHTS: Record<string, { weight: number; requiresPermit: boolean; note: string }> = {
  "DJI Mini 2": { weight: 249, requiresPermit: false, note: "Under 250g — no permit needed" },
  "DJI Mini 4 Pro": { weight: 895, requiresPermit: true, note: "895g — requires permit + Vietnamese org sponsor" },
  "DJI Air 3": { weight: 720, requiresPermit: true, note: "720g — requires permit" },
  "DJI Mavic 3": { weight: 895, requiresPermit: true, note: "895g — requires permit" },
  "Other": { weight: 999, requiresPermit: true, note: "Unknown weight — assume permit required" },
};

export function getIdpStatus(nationality: string): {
  convention: string;
  valid: boolean;
  note: string;
} {
  if (IDP_VALIDITY.valid_1968.includes(nationality)) {
    return { convention: "1968 Vienna Convention", valid: true, note: "IDP is valid in Vietnam" };
  }
  if (IDP_VALIDITY.asean_valid.includes(nationality)) {
    return { convention: "ASEAN driving license", valid: true, note: "ASEAN license accepted" };
  }
  if (IDP_VALIDITY.bilateral.includes(nationality)) {
    return { convention: "Bilateral agreement", valid: true, note: "License accepted under bilateral agreement" };
  }
  if (IDP_VALIDITY.invalid_1949.includes(nationality)) {
    return { convention: "1949 Geneva Convention", valid: false, note: "1949 Geneva IDP not recognized — cannot drive legally" };
  }
  return { convention: "Unknown", valid: false, note: "IDP validity unknown for this nationality — verify before driving" };
}

export function getVisaFreeDays(nationality: string): number {
  for (const [days, countries] of Object.entries(VISA_FREE_DAYS)) {
    if (countries.includes(nationality)) return Number(days);
  }
  return 15; // default
}

export const NATIONALITIES = [
  "Australia", "Austria", "Belgium", "Brazil", "Brunei", "Cambodia", "Canada",
  "China", "Czech Republic", "Denmark", "Finland", "France", "Germany",
  "India", "Indonesia", "Italy", "Japan", "Laos", "Malaysia", "Myanmar",
  "Netherlands", "New Zealand", "Norway", "Philippines", "Poland", "Portugal",
  "Russia", "Singapore", "South Korea", "Spain", "Sweden", "Switzerland",
  "Thailand", "Ukraine", "United Kingdom", "United States", "Vietnam",
];
