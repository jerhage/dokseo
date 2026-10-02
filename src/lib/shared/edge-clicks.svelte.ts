import { readEdgeClicksTurn, saveEdgeClicksTurn } from './edge-clicks-setting';
import { RememberedChoice } from './remembered-choice.svelte';

const wanted = new RememberedChoice<boolean>(readEdgeClicksTurn, saveEdgeClicksTurn);

function edgeClicksTurn(): boolean {
  return wanted.value;
}

function chooseEdgeClicksTurn(on: boolean): void {
  wanted.choose(on);
}

export { chooseEdgeClicksTurn, edgeClicksTurn };
