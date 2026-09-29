import { readAllCaptures, saveAllCaptures } from './all-captures-setting';

let wanted = $state(readAllCaptures());

function allCapturesWanted(): boolean {
  return wanted;
}

function chooseAllCaptures(on: boolean): void {
  wanted = on;
  saveAllCaptures(on);
}

export { allCapturesWanted, chooseAllCaptures };
