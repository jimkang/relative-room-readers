import './app.css';
import { URLStore } from '@jimkang/url-store';
import handleError from 'handle-error-web';
import { version } from './package.json';
import seedrandom from 'seedrandom';
import RandomId from '@jimkang/randomid';
import { createProbable as Probable } from 'probable';
import OLPE from 'one-listener-per-element';
import ContextKeeper from 'audio-context-singleton';
import { renderBoard } from './renderers/render-board';
import { Player, MusicEvent } from './types';
import { range } from 'd3-array';
import { downloadSamples } from 'synthskel/tasks/download-samples';
import math from 'basic-2d-math';
import { tonalityDiamondPitches } from 'synthskel/tonality-diamond';

const abc = 'abcdefghijklmnopqrstuvwxyz';
var sampleBuffers: AudioBuffer[];
var randomId = RandomId();
var { on } = OLPE();
var { getCurrentContext } = ContextKeeper();

// Ephemeral state
var prob;
var urlStore;
// var fileInput: HTMLInputElement = document.getElementById(
//   'file'
// ) as HTMLInputElement;
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
  players = ((state.players as unknown[]) || [])
    .map(fixPlayer)
    .map(addPlayerMethods);
  // console.log('Deserialized players:', players);
  // players[0].uiState.selected = true;
  // console.log('Deserialized players:', players);
  var random = seedrandom(state.seed);
  prob = Probable({ random });
  prob.roll(2);

  var ctx;
  try {
    ctx = await new Promise((resolve, reject) =>
      getCurrentContext((error, ctx) => (error ? reject(error) : resolve(ctx)))
    );
    if (!sampleBuffers || sampleBuffers.length < 1) {
      sampleBuffers = await new Promise((resolve, reject) =>
        downloadSamples(
          {
            ctx,
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
    }
  } catch (error) {
    handleError(error);
  }

  wireControls({ /*onFileChange,*/ onAddPlayer, onPlay });
  renderBoard({ players, onUpdatePlayers });
}

function onUpdatePlayers() {
  // players uiState is wrong on the second click here.
  // So what is onClickPlayer updating?
  urlStore.update({ players });
}

function wireControls({ /*onFileChange,*/ onAddPlayer, onPlay }) {
  // on('#file', 'change', onFileChange);
  on('#add-button', 'click', onAddPlayer);
  on('#play-button', 'click', onPlay);
}

function onAddPlayer() {
  players.push(
    addPlayerMethods(
      fixPlayer({
        id: 'player-' + randomId(4),
        label: getLabel(players.length),
        position: { x: 25, y: 25 },
        uiState: { selected: false },
        sampleIndex: 0,
        pan: 0,
        amp: 0.5,
        evaluationWindowSizeInEvents: 4,
        responseStrategyName: 'echo',
        evaluationWindow: [],
      })
    )
  );

  urlStore.update({ players });
}

function playToOthers(sender: Player, event: MusicEvent) {
  var others = (players as Player[]).filter(
    (player) => player.id !== sender.id
  );
  others.forEach((player) =>
    setTimeout(
      () => player.hear(player, event),
      timeForDistance(sender, player)
    )
  );
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

function onPlay() {
  var selectedPlayers = (players as Player[]).filter(
    (player) => player?.uiState?.selected
  );
  if (selectedPlayers.length > 0) {
    selectedPlayers[0].start(selectedPlayers[0]);
  }
}

function fixPlayer(player) {
  // TODO: Fix nested object bug in url-store.
  return Object.assign(player, {
    position: {
      x: +(player?.position?.x || 0),
      y: +(player?.position?.y || 0),
    },
    uiState: {
      selected: JSON.parse(player?.uiState?.selected as unknown as string),
    },
    evaluationWindow: [],
  });
}

function addPlayerMethods(player) {
  return Object.assign(player, {
    hear(you: Player, e: MusicEvent) {
      you.evaluationWindow.push(e);
      if (you.evaluationWindow.length >= you.evaluationWindowSizeInEvents) {
        you.respond(you, you.evaluationWindow);
        you.evaluationWindow.length = 0;
      }
      console.log(you.id, 'heard', e);
    },
    respond(you: Player, events: MusicEvent[]) {
      if (you.responseStrategyName === 'echo') {
        // TODO: Timing.
        events.forEach((event) => playToOthers(you, event));
      }
    },
    start(you: Player) {
      var events = prob
        .shuffle(tonalityDiamondPitches.slice(0, 8))
        .slice(0, 4)
        .map((pitch) => ({
          senderId: you.id,
          pitch,
          lengthSeconds: 0.5,
          metaMessage: 'Start bar',
        }));
      events.forEach((event) => playToOthers(you, event));
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

function timeForDistance(a: Player, b: Player) {
  return (
    10 *
    math.getVectorMagnitude(
      math.subtractPairs(
        [a.position.x, a.position.y],
        [b.position.x, b.position.y]
      )
    )
  );
}

function reportTopLevelError(event: ErrorEvent) {
  handleError(event.error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info') as HTMLElement;
  versionInfo.textContent = version;
}
