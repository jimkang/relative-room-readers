import './app.css';
import { Player, PlayerData, RuntimePlayKit } from './types';
import { range } from 'd3-array';
import { URLStore } from '@jimkang/url-store';
import handleError from 'handle-error-web';
import { version } from './package.json';
import seedrandom from 'seedrandom';
import RandomId from '@jimkang/randomid';
import { createProbable as Probable } from 'probable';
import OLPE from 'one-listener-per-element';
import ContextKeeper from 'audio-context-singleton';
import { renderBoard } from './renderers/render-board';
import { downloadSamples } from 'synthskel/tasks/download-samples';
import { MainOut } from 'synthskel/synths/main-out';
import { hear, respond, start } from './tasks/player-methods';

const abc = 'abcdefghijklmnopqrstuvwxyz';
var randomId = RandomId();
var { on } = OLPE();
var { getCurrent } = ContextKeeper();

var urlStore;

// Ephemeral state
// var fileInput: HTMLInputElement = document.getElementById(
//   'file'
// ) as HTMLInputElement;
var kit: RuntimePlayKit = {
  prob: null,
  dest: null,
  sampleBuffers: [],
  // @ts-ignore
  ctx: null,
  players: [],
};

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
  var random = seedrandom(state.seed);
  (kit.prob = Probable({ random })),
  (kit.players = ((state.players as PlayerData[]) || [])
    .map(fixPlayer)
    .map(addPlayerMethods));
  wireControls({ /*onFileChange,*/ onAddPlayer, onPlay });
  renderBoard({ players: kit.players, onUpdatePlayers });
}

function onUpdatePlayers() {
  // players uiState is wrong on the second click here.
  // So what is onClickPlayer updating?
  urlStore.update({ players: kit.players });
}

function wireControls({ /*onFileChange,*/ onAddPlayer, onPlay }) {
  // on('#file', 'change', onFileChange);
  on('#add-button', 'click', onAddPlayer);
  on('#play-button', 'click', onPlay);
}

function onAddPlayer() {
  kit.players.push(
    addPlayerMethods(
      fixPlayer({
        id: 'player-' + randomId(4),
        label: getLabel(kit.players.length),
        position: { x: 25, y: 25 },
        uiState: { selected: false },
        sampleIndex: 0,
        pan: kit.prob.pick([-1, 1]),
        amp: 0.5,
        evaluationWindowSizeInEvents: 4,
        responseStrategyName: 'echo',
        evaluationWindow: [],
        tickSecs: 0.5,
        uninterruptibleWindowLength: 1,
        lastStarted: 0,
      })
    )
  );

  urlStore.update({ players: kit.players });
}

// async function onFileChange() {
//   if (!fileInput?.files?.length) {
//     return;
//   }

//   //   try {
//   //     srcAudioBuffer = await getAudioBufferFromFile({
//   //       file: fileInput.files[0],
//   //     });
//   //     // TODO: Impl. urlStore ephemeral state, put it thes.
//   //   } catch (error) {
//   //     handleError(error);
//   //   }
// }

async function onPlay() {
  // No context initialization can be done without a click.
  kit.ctx = getCurrent();
  if (!kit.sampleBuffers || kit.sampleBuffers.length < 1) {
    try {
      kit.sampleBuffers = await new Promise((resolve, reject) =>
        downloadSamples(
          {
            ctx: kit.ctx,
            baseURL: 'samples',
            sampleFiles: [
              'trumpet-D2.wav',
              'glass-less-full.wav',
              'timpani-d.wav',
              'Vibraphone.sustain.ff.D4.wav',
            ],
          },
          (error, buffers) => (error ? reject(error) : resolve(buffers))
        )
      );
    } catch (error) {
      handleError(error);
    }
  }

  kit.dest = MainOut({ ctx: kit.ctx, totalSeconds: 60 });

  var selectedPlayers = kit.players.filter(
    (player) => player?.uiState?.selected
  );
  if (selectedPlayers.length > 0) {
    selectedPlayers[0].start({ you: selectedPlayers[0], kit });
  }
}

function fixPlayer(playerData: PlayerData) {
  // TODO: Fix nested object bug in url-store.
  Object.assign(playerData, {
    position: {
      x: +(playerData?.position?.x || 0),
      y: +(playerData?.position?.y || 0),
    },
    uiState: {
      selected: JSON.parse(playerData?.uiState?.selected as unknown as string),
    },
    evaluationWindow: [],
  });
  [
    'sampleIndex',
    'pan',
    'amp',
    'evaluationWindowSizeInEvents',
    'tickSecs',
    'uninterruptibleWindowLength',
    'lastStarted',
  ].forEach(setNumberProp);

  return playerData;

  function setNumberProp(prop) {
    if (prop in playerData) {
      playerData[prop] = +playerData[prop];
    }
  }
}

function addPlayerMethods(playerData: PlayerData): Player {
  return Object.assign({ hear, respond, start }, playerData);
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
