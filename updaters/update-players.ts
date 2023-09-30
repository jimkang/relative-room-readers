import DataJoiner from 'data-joiner';
import { PlayerData, RuntimePlayKit } from '../types';
import { fixPlayer, addPlayerMethods } from '../tasks/player-methods';
import handleError from 'handle-error-web';

var joiner = DataJoiner({
  keyFn: function getId(datum) {
    return datum.id;
  },
});

export function updatePlayers({
  kit,
  playerData,
}: {
  kit: RuntimePlayKit;
  playerData: PlayerData[];
}) {
  joiner.update(playerData || []);

  // TODO: Shut these down and remove these
  // joiner.exit();
  //
  kit.players = kit.players.concat(
    joiner.enter().map(fixPlayer).map(addPlayerMethods)
  );

  // Update the players that already exist with the incoming data.
  playerData.forEach(updateExistngPlayer);

  function updateExistngPlayer(incomingPlayerData: PlayerData) {
    var existingPlayer = kit.players.find(
      (p) => p.id === incomingPlayerData.id
    );
    if (!existingPlayer) {
      // Should it do this directly, though?
      handleError(
        new Error(
          'Could not find player that matches id ' + incomingPlayerData.id
        )
      );
      return;
    }
    Object.assign(existingPlayer, fixPlayer(incomingPlayerData));
  }
}
