export interface PlacementToken {
  teamId: string;
  currentInterval: { start: number; end: number };
  positionInInterval: number;
}
