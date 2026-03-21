export type LegalityUiState =
  | "uncertain"
  | "checking"
  | "safe"
  | "warning"
  | "restricted";

export function deriveLegalityState(answer: string): LegalityUiState {
  const trimmed = answer.trim();

  if (!trimmed) return "uncertain";
  if (trimmed.startsWith("✅")) return "safe";
  if (trimmed.startsWith("⚠️")) return "warning";
  if (trimmed.startsWith("❌")) return "restricted";

  const lowered = trimmed.toLowerCase();
  if (lowered.includes("illegal")) return "restricted";
  if (lowered.includes("restricted")) return "warning";
  if (lowered.includes("legal")) return "safe";

  return "warning";
}

export function getLegalityTone(state: LegalityUiState) {
  switch (state) {
    case "checking":
      return "Cross-checking the scenario against TripGuard's legal workflow.";
    case "safe":
      return "The scenario appears aligned. Review the consequence and source before acting.";
    case "warning":
      return "Proceed carefully. The condition is not fully open-ended.";
    case "restricted":
      return "Stop before acting. This scenario likely creates legal exposure.";
    case "uncertain":
    default:
      return "Describe the situation clearly. TripGuard will classify the legal posture.";
  }
}
