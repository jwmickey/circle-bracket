export enum BracketFormat {
  ncaa = "ncaa",
}

export enum RegionPosition {
  TL = "TL",
  BL = "BL",
  TR = "TR",
  BR = "BR",
}

export interface Region {
  name: string;
  position: RegionPosition;
}

export interface Contestant {
  name: string;
  code: string;
  seed: number;
  score?: number;
  winner?: boolean;
  vacated?: boolean;
}

export interface Game {
  home: Contestant;
  away: Contestant;
  date?: string;
  location?: string;
  region: RegionPosition;
  round: number;
  isComplete: boolean;
  link?: string;
}

export interface BracketData {
  format: BracketFormat;
  updated: string;
  year: number;
  displaySeeds?: boolean;
  status?: string;
  notes?: string;
  regions: Region[];
  games: Game[];
}

export interface BracketSettings {
  gridStrokeWidth: number;
  gridStrokeStyle: string;
  scale: number;
  showGameDetails(game: Game, displaySeeds?: boolean): void;
}

export interface TeamPath {
  path: Path2D;
  round: number;
  teamCode: string;
}
