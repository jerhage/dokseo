import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import { readAllCaptures, saveAllCaptures } from './all-captures-setting';

const wanted = new RememberedChoice<boolean>(readAllCaptures, saveAllCaptures);

function allCapturesWanted(): boolean {
  return wanted.value;
}

function chooseAllCaptures(on: boolean): void {
  wanted.choose(on);
}

export { allCapturesWanted, chooseAllCaptures };
