import './app.css';
import { URLStore } from '@jimkang/url-store';
import handleError from 'handle-error-web';
import { version } from './package.json';
import seedrandom from 'seedrandom';
import RandomId from '@jimkang/randomid';
import { createProbable as Probable } from 'probable';
import OLPE from 'one-listener-per-element';
import { getAudioBufferFromFile } from 'synthskel/tasks/get-audio-buffer-from-file';
import ContextKeeper from 'audio-context-singleton';
import { renderBoard } from './renderers/render-board';
import { Player } from './types';
import { range } from 'd3-array';

const abc = 'abcdefghijklmnopqrstuvwxyz';
var randomId = RandomId();
var { on } = OLPE();
var { getCurrentContext } = ContextKeeper();

// Ephemeral state
var prob;
var urlStore;
var fileInput: HTMLInputElement = document.getElementById(
  'file'
) as HTMLInputElement;
var segmentInput: HTMLInputElement = document.getElementById(
  'segment-count-field'
) as HTMLInputElement;
var silenceInput: HTMLInputElement = document.getElementById(
  'silence-field'
) as HTMLInputElement;
var srcAudioBuffer;
var players: Player[] = [];

(async function go() {
  window.addEventListener('error', reportTopLevelError);
  renderVersion();

  urlStore = URLStore({
    onUpdate,
    defaults: {
      seed: randomId(8),
    },
    windowObject: window,
  });
  urlStore.update();
})();

async function onUpdate(
  state: Record<string, unknown>
  //  ephemeralState: Record<string, unknown>
) {
  players = ((state.players as Player[]) || []).map(fixPlayer);
  console.log('Deserialized players:', players);
  var random = seedrandom(state.seed);
  prob = Probable({ random });
  prob.roll(2);

  wireControls(Object.assign({ onFileChange, onAddPlayer }, state));
  renderBoard({ players, onUpdatePlayer });
}

function onUpdatePlayer() {
  urlStore.update({ players });
}

function wireControls({
  onFileChange,
  // onScramble,
  segmentCount,
  silenceSeconds,
}) {
  segmentInput.value = segmentCount;
  silenceInput.value = silenceSeconds;

  on('#file', 'change', onFileChange);
  on('#add-button', 'click', onAddPlayer);
}

function onAddPlayer() {
  players.push({
    id: 'player-' + randomId(4),
    label: getLabel(players.length),
    position: { x: 25, y: 25 },
    uiState: { selected: false },
  });
  urlStore.update({ players });
}

async function onFileChange() {
  if (!fileInput?.files?.length) {
    return;
  }

  try {
    srcAudioBuffer = await getAudioBufferFromFile({
      file: fileInput.files[0],
    });
    // TODO: Impl. urlStore ephemeral state, put it thes.
  } catch (error) {
    handleError(error);
  }
}

function fixPlayer(player: Player) {
  // TODO: Fix nested object bug in url-store.
  return Object.assign(player, {
    position: { x: +player.position.x, y: +player.position.y },
    uiState: {
      selected:
        player.uiState.selected &&
        (player.uiState.selected as unknown as string) !== 'false',
    },
  });
}

function getLabel(index) {
  const letter = abc[index % abc.length];
  const count = Math.floor(index / abc.length) + 1;
  return range(count)
    .map(() => letter)
    .join();
}

function reportTopLevelError(event: ErrorEvent) {
  handleError(event.error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info') as HTMLElement;
  versionInfo.textContent = version;
}
