import { loadVerb } from '../../domain/model/model-load';
import type { ModelLoad } from '../../domain/model/model-load';

const READING_SELECTION = 'Reading the selection.';

const FULL_PERCENT = 100;

function loadPercent(load: ModelLoad): number {
  return Math.round(load.fraction * FULL_PERCENT);
}

function modelLoadNote(load: ModelLoad): string {
  return `${loadVerb(load.source)} the model · ${loadPercent(load)}%`;
}

function modelLoadAnnouncement(load: ModelLoad | null): string {
  if (load === null) return READING_SELECTION;
  return `${loadVerb(load.source)} the recognition model, ${loadPercent(load)} percent.`;
}

export { READING_SELECTION, modelLoadAnnouncement, modelLoadNote };
