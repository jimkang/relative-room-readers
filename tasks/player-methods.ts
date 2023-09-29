import { Player, MusicEvent, RuntimePlayKit } from '../types';
import {
  newPlayEventForScoreEvent,
  playPlayEvent,
} from 'synthskel/tasks/play-event';
import { TonalityDiamond } from 'synthskel/tonality-diamond';
import math from 'basic-2d-math';
import { ScoreEvent } from 'synthskel/types';
import { SynthNode } from 'synthskel/synths/synth-node';

var { pitches: tonalityDiamondPitches } = TonalityDiamond({ diamondLimit: 5 });
var envelopeCurve = new Float32Array([0, 0.5, 1]);

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
        kit.ctx.currentTime - you.lastStarted >
        you.uninterruptibleWindowLength
      ) {
        you.respond({ you, events: you.evaluationWindow, kit });
        you.evaluationWindow.length = 0;
      }
    }
  }
  console.log(you.id, 'heard', event);
  if (you.uiState.selected) {
    let playEvent = newPlayEventForScoreEvent({
      scoreEvent: scoreEventForMusicEvent({
        musicEvent: event,
        variableSampleIndex: you.sampleIndex || 0,
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
  if (you.responseStrategyName === 'echo') {
    if (!you.lastStarted) {
      you.lastStarted = kit.ctx.currentTime;
    }
    events.forEach((event) => broadcast({ sender: you, event, kit }));
    const totalEventSeconds = events.reduce(
      (total, event) => total + event.lengthSeconds,
      0
    );
    setTimeout(() => (you.lastStarted = 0), totalEventSeconds * 1000);
  }
}

export function start({ you, kit }: { you: Player; kit: RuntimePlayKit }) {
  var events = kit.prob
    .shuffle(tonalityDiamondPitches.slice(0, 8))
    .slice(0, 4)
    .map((pitch) => ({
      senderId: you.id,
      pitch,
      lengthSeconds: 2,
      metaMessage: 'Start bar',
      pan: you.pan,
    }));
  var nextStartTimeSecs = 0;
  for (let i = 0; i < events.length; ++i) {
    let event = events[i];
    setTimeout(
      () => broadcast({ sender: you, event, kit }),
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
  return (
    100 *
    math.getVectorMagnitude(
      math.subtractPairs(
        [a.position.x, a.position.y],
        [b.position.x, b.position.y]
      )
    )
  );
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
    peakGain: 0.5,
    variableSampleIndex,
    absoluteLengthSeconds: musicEvent.lengthSeconds,
    pan: musicEvent.pan,
  };
}
