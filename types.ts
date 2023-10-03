import { SynthNode } from 'synthskel/synths/synth-node';

export interface Pt {
  x: number;
  y: number;
}

export interface UIState {
  selected: boolean;
}

export interface Player extends PlayerData, PlayerMethods {}

// Time is in seconds unless otherwise noted.
export interface PlayerData {
  id: string;
  label: string;
  position: Pt;
  uiState: UIState;
  sampleIndex?: number;
  pan: number;
  amp: number;
  evaluationWindow: MusicEvent[];
  evaluationWindowSizeInEvents: number;
  responseStrategyNames?: string[];
  tickSecs: number;
  // uninterruptibleWindowLength: number;
  canNextRespondAtTime: number;
}

export interface RuntimePlayKit {
  prob;
  dest: SynthNode;
  sampleBuffers: AudioBuffer[];
  ctx: AudioContext;
  players: Player[];
}

export interface PlayerMethods {
  hear: ({
    you,
    event,
    kit,
  }: {
    you: Player;
    event: MusicEvent;
    kit: RuntimePlayKit;
  }) => void;

  respond: ({
    you,
    events,
    kit,
  }: {
    you: Player;
    events: MusicEvent[];
    kit: RuntimePlayKit;
  }) => void;

  start: ({ you, kit }: { you: Player; kit: RuntimePlayKit }) => void;
}

export interface MusicEvent {
  senderId: string;
  pitch: number;
  lengthSeconds: number;
  metaMessage: string;
  pan: number;
  sampleIndex?: number;
  amp: number;
}
