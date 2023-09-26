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
  onUpdatePlayers,
  className = 'player',
  playerRadius = 4,
}: {
  players: Player[];
  onUpdatePlayers: () => void;
  className?: string;
  playerRadius?: number;
}) {
  // var posLastUpdatedTime = 0.0;
  var applyDragBehavior = drag()
    .container(boardSel.node())
    // To avoid conflicts with click events, do this
    // update after a delay.
    .on('drag', updatePlayerPosition)
    .on('end', onUpdatePlayers);

  var playerRoot = select(`.${className}-root`);
  var playerSel = playerRoot
    .selectAll('.' + className)
    .data(players, accessor());
  playerSel.exit().remove();
  var newPlayers = playerSel
    .enter()
    .append('g')
    .classed(className, true)
    .classed('chit', true);

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
  currentPlayers
    .classed('selected', isSelected)
    // It is super important to add the onClickPlayer event listener to the
    // current selection, rather than only when the elements are first created
    // by .enter(). This is because onClickPlayer uses a this function's closure
    // to refer to `players`. If you put onClickPlayer on
    // once when the elements enter, then it will always refer to an old copy
    // of `players`, even if this function, renderBoard() is called again with a new copy.
    .on('click', onClickPlayer);

  currentPlayers.select('.name').text(accessor('label'));
  currentPlayers.call(applyDragBehavior);

  function isSelected(player: Player) {
    return player.uiState.selected;
  }

  // @ts-ignore
  function onClickPlayer(e, player: Player) {
    players.forEach(setSelected);
    // console.log('players going into update:', players);
    onUpdatePlayers();

    function setSelected(p: Player) {
      p.uiState.selected = p.id === player.id;
      console.log(p.id, 'selected:', p.uiState.selected);
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
