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
  // evaluationWindowInTicks
  // responseStrategyForWindow;
  // play(tick)
}

export interface MusicEvent {
  senderId: string;
  pitches: number[];
  metaMessage: string;
}
