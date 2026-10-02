import type { TouchTurns } from './page-turn';
import { RememberedChoice } from './remembered-choice.svelte';
import { readTouchTurns, saveTouchTurns } from './touch-turns';

const wanted = new RememberedChoice<TouchTurns>(readTouchTurns, saveTouchTurns);

function touchTurns(): TouchTurns {
  return wanted.value;
}

function chooseTouchTurns(turns: TouchTurns): void {
  wanted.choose(turns);
}

export { chooseTouchTurns, touchTurns };
