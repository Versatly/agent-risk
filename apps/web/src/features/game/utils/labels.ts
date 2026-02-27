export function formatPhaseLabel(phase: string): string {
  return phase
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatTerritoryLabel(territoryId: string): string {
  return territoryId
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
