import { Player, PlayerData, MusicEvent, RuntimePlayKit } from '../types';
import {
  newPlayEventForScoreEvent,
  playPlayEvent,
} from 'synthskel/tasks/play-event';
import { TonalityDiamond } from 'synthskel/tonality-diamond';
import math from 'basic-2d-math';
import { ScoreEvent } from 'synthskel/types';
import { SynthNode } from 'synthskel/synths/synth-node';
import { range } from 'd3-array';

const maxResponseEvents = 8;

var { pitches: tonalityDiamondPitches } = TonalityDiamond({ diamondLimit: 5 });
var envelopeCurve = new Float32Array([0, 0.5, 1, 1, 1, 1, 1, 1, 0.5, 0.1]);

export async function hear({
  you,
  event,
  kit,
}: {
  you: Player;
  event: MusicEvent;
  kit: RuntimePlayKit;
}) {
  // Don't respond to yourself in order to prevent an infinite loop.
  if (you.id !== event.senderId) {
    // TODO: evaluation window needs to either stack for multiple senders or have a sense of time.
    you.evaluationWindow.push(event);
    if (you.evaluationWindow.length >= you.evaluationWindowSizeInEvents) {
      if (
        kit.ctx.currentTime >= you.canNextRespondAtTime
        // kit.ctx.currentTime - you.canNextRespondAtTime >
        // you.uninterruptibleWindowLength
      ) {
        you.respond({
          you,
          events: you.evaluationWindow.slice(0, maxResponseEvents),
          kit,
        });
        you.evaluationWindow.length = 0;
      } else {
        console.log(you.label, 'is too busy to respond');
      }
    }
  }
  console.log(you.id, 'heard', event);
  if (you.uiState.selected) {
    let playEvent = newPlayEventForScoreEvent({
      scoreEvent: scoreEventForMusicEvent({
        musicEvent: event,
        variableSampleIndex: event.sampleIndex || 0,
      }),
      sampleBuffer: null,
      variableSampleBuffers: kit.sampleBuffers,
      ctx: kit.ctx,
      tickLength: 1,
      slideMode: false,
      envelopeCurve,
      getEnvelopeLengthForScoreEvent: null,
    });
    connectLastToDest({ chain: playEvent.nodes, dest: kit.dest });
    playPlayEvent({ playEvent, startTime: 0 });
  }
}

export function respond({
  you,
  events,
  kit,
}: {
  you: Player;
  events: MusicEvent[];
  kit: RuntimePlayKit;
}) {
  console.log(
    you.label,
    'is responding to',
    events.length,
    'events:',
    events.map((e) => e.senderId)
  );
  var responseEvents: MusicEvent[] = [];
  const responseStrategyName = kit.prob.pick(you.responseStrategyNames);
  if (responseStrategyName === 'echo') {
    responseEvents = events.map(copyEventForYou);
  } else if (responseStrategyName === 'harmonize') {
    responseEvents = events
      .map(copyEventForYou)
      .map((event) =>
        shiftPitch(event, kit.prob.pick([0.5, 1 / 1.33, 1.33, 2]))
      );
  } else {
    throw new Error('No responseStrategyName.');
  }

  broadcastEventsInSerial({
    sender: you,
    events: responseEvents,
    kit,
  });
  const totalEventSeconds = responseEvents.reduce(
    (total, event) => total + event.lengthSeconds,
    0
  );
  if (!you.canNextRespondAtTime) {
    you.canNextRespondAtTime = kit.ctx.currentTime + totalEventSeconds;
  }
  setTimeout(() => (you.canNextRespondAtTime = 0), totalEventSeconds * 1000);

  function copyEventForYou(event) {
    return Object.assign({}, event, {
      senderId: you.id,
      sampleIndex: you.sampleIndex,
      amp: you.amp,
      pan: you.pan,
    });
  }
}

export function start({ you, kit }: { you: Player; kit: RuntimePlayKit }) {
  var riffPitches = kit.prob
    .shuffle(tonalityDiamondPitches.slice(0, 7))
    .slice(0, 4);
  var riff = range(4)
    .map(() => riffPitches)
    .flat();
  var events = riff.map((pitch) => ({
    senderId: you.id,
    pitch,
    lengthSeconds: 2,
    metaMessage: 'Start bar',
    pan: you.pan,
    sampleIndex: you.sampleIndex,
    amp: you.amp,
  }));
  broadcastEventsInSerial({ sender: you, events, kit });
}

function broadcastEventsInSerial({
  sender,
  events,
  kit,
}: {
  sender: Player;
  events: MusicEvent[];
  kit: RuntimePlayKit;
}) {
  var nextStartTimeSecs = 0;
  for (let i = 0; i < events.length; ++i) {
    let event = events[i];
    setTimeout(
      () => broadcast({ sender, event, kit }),
      nextStartTimeSecs * 1000
    );
    nextStartTimeSecs += event.lengthSeconds;
  }
}

function broadcast({
  sender,
  event,
  kit,
}: {
  sender: Player;
  event: MusicEvent;
  kit: RuntimePlayKit;
}) {
  var others = (kit.players as Player[]).filter(
    (player) => player.id !== sender.id
  );
  others.forEach((player) =>
    setTimeout(
      () => player.hear({ you: player, event, kit }),
      timeForDistance(sender, player)
    )
  );
  // Send it to yourself, too.
  sender.hear({ you: sender, event, kit });
}

// TODO: Move to synthskel
function connectLastToDest({
  chain,
  dest,
}: {
  chain: SynthNode[];
  dest: SynthNode;
}) {
  // TODO: Connect to limiter instead.
  if (chain.length > 0) {
    chain[chain.length - 1].connect({
      synthNode: dest,
      audioNode: null,
    });
  }
}

function timeForDistance(a: Player, b: Player) {
  const distance = math.getVectorMagnitude(
    math.subtractPairs(
      [a.position.x, a.position.y],
      [b.position.x, b.position.y]
    )
  );
  console.log(a.id, 'to', b.id, 'distance:', distance);
  return 100 * distance;
}

function scoreEventForMusicEvent({
  musicEvent,
  variableSampleIndex,
}: {
  musicEvent: MusicEvent;
  variableSampleIndex: number;
}): ScoreEvent {
  return {
    rate: musicEvent.pitch,
    delay: 0,
    peakGain: 0.5 * musicEvent.amp,
    variableSampleIndex,
    absoluteLengthSeconds: musicEvent.lengthSeconds,
    pan: musicEvent.pan,
  };
}

export function fixPlayer(playerData: PlayerData) {
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
    // 'uninterruptibleWindowLength',
    'canNextRespondAtTime',
  ].forEach(setNumberProp);

  return playerData;

  function setNumberProp(prop) {
    if (prop in playerData) {
      playerData[prop] = +playerData[prop];
    }
  }
}

function shiftPitch(event: MusicEvent, multiplier: number) {
  event.pitch *= multiplier;
  return event;
}

export function addPlayerMethods(playerData: PlayerData): Player {
  return Object.assign({ hear, respond, start }, playerData);
}
