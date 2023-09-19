import { Player } from '../types';
import { select } from 'd3-selection';
import accessor from 'accessor';
import { drag } from 'd3-drag';
import { zoom } from 'd3-zoom';

var boardSel = select('.board');
var zoomRootSel = boardSel.select('.zoom-root');

var zoomer = zoom().on('zoom', onZoom);
boardSel.call(zoomer);

export function renderBoard({
  players,
  onUpdatePlayer,
}: {
  players: Player[];
  onUpdatePlayer: (player: Player) => void;
}) {
  // var posLastUpdatedTime = 0.0;

  var applyDragBehavior = drag()
    .container(boardSel.node())
    .on('end', onUpdatePlayer)
    .on('drag', updatePlayerPosition);

  renderPlayers({ players }).call(applyDragBehavior);

  function renderPlayers({
    players,
    className = 'player',
    playerRadius = 4,
  }: {
    players: Player[];
    className?: string;
    playerRadius?: number;
  }) {
    var playerRoot = select(`.${className}-root`);
    var playerSel = playerRoot
      .selectAll('.' + className)
      .data(players, accessor());
    playerSel.exit().remove();
    var newPlayers = playerSel
      .enter()
      .append('g')
      .classed(className, true)
      .classed('chit', true)
      .on('click', onClickPlayer);

    newPlayers
      .append('circle')
      .attr('r', playerRadius)
      .attr('cx', playerRadius)
      .attr('cy', playerRadius);
    newPlayers
      .append('foreignObject')
      .attr('width', playerRadius * 2)
      .attr('height', playerRadius * 2)
      // Never forget: Using the namespace when appending an html
      // element to a foreignObject is incredibly important. Without it,
      // a div will not size itself correctly for its contents.
      .append('xhtml:div')
      .classed('name-container', true)
      .append('xhtml:div')
      .classed('name', true);

    var currentPlayers = newPlayers.merge(playerSel);
    currentPlayers.attr('transform', getTransform);
    currentPlayers.classed('selected', isSelected);

    return currentPlayers;

    function isSelected(player: Player) {
      return player.uiState.selected;
    }

    function onClickPlayer(player: Player) {
      for (let p of players) {
        p.uiState.selected = p.id === player.id;
      }
      onUpdatePlayer(player);
    }
  }

  function updatePlayerPosition(dragEvent, player: Player) {
    player.position.x += round(dragEvent.dx, 2);
    player.position.y += round(dragEvent.dy, 2);
    console.log('player.position', player.position);
    select(this).attr('transform', getTransform(player));
  }
}

function getTransform(player: Player) {
  return `translate(${player.position.x}, ${player.position.y})`;
}

function onZoom(zoomEvent) {
  zoomRootSel.attr('transform', zoomEvent.transform);
}

function round(val, places) {
  const factor = Math.pow(10, places);
  return Math.trunc(val * factor) / factor;
}
