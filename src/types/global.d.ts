// Ambient type for the optional ability-tracking hook injected by the in-app manual test
// harness (src/test/AbilitiesTest.jsx) to collect ability usage statistics across simulated
// games. Absent during normal play - every call site guards with `if (window.trackAbility)`.
export {}

declare global {
  interface Window {
    trackAbility?: (
      abilityId: string,
      action: string,
      difficulty: string,
      details?: Record<string, unknown>
    ) => void
  }
}
