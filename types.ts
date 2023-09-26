export interface Pt {
  x: number;
  y: number;
}

export interface UIState {
  selected: boolean;
}

export interface Player {
  id: string;
  label: string;
  position: Pt;
  uiState: UIState;
  sampleIndex?: number;
  pan: number;
  amp: number;
  evaluationWindow: MusicEvent[];
  evaluationWindowSizeInEvents: number;
  responseStrategyName?: string;
  hear: (you: Player, event: MusicEvent) => void;
  respond: (you: Player, events: MusicEvent[]) => void;
  start: (you: Player) => void;
}

export interface MusicEvent {
  senderId: string;
  pitch: number;
  lengthSeconds: number;
  metaMessage: string;
  pan: number;
}
