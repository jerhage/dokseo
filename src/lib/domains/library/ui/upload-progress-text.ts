import { match } from 'ts-pattern';
import type { SourceKind } from '../domain/book';
import {
  uploadCount,
  uploadFraction,
  uploadRemainingSeconds,
  type UploadStage,
} from '../domain/upload-progress';

const MINUTE_SECONDS = 90;

function sourceNoun(sourceKind: SourceKind): string {
  return match(sourceKind)
    .with('pdf', () => 'the PDF')
    .with('archive', () => 'the archive')
    .with('images', () => 'the packed images')
    .exhaustive();
}

function remainingText(seconds: number): string {
  if (seconds < MINUTE_SECONDS) return `~${seconds}s left`;
  return `~${Math.ceil(seconds / 60)}m left`;
}

function qualified(verb: string, stage: UploadStage): string {
  const fraction = uploadFraction(stage);
  const seconds = uploadRemainingSeconds(stage);
  const parts: string[] = [];
  if (fraction !== null) parts.push(`${Math.round(fraction * 100)}%`);
  if (seconds !== null) parts.push(remainingText(seconds));
  if (parts.length === 0) return verb;
  return `${verb} — ${parts.join(' · ')}`;
}

export function uploadCountText(stage: UploadStage): string | null {
  const count = uploadCount(stage);
  if (count === null) return null;

  const noun = count.total === 1 ? 'page' : 'pages';
  if (count.done === null) return `${count.total.toLocaleString()} ${noun}`;
  return `${count.done.toLocaleString()} / ${count.total.toLocaleString()} ${noun}`;
}

export function uploadStageText(stage: UploadStage): string {
  return match(stage)
    .with({ kind: 'inspecting' }, () => 'Reading the drop')
    .with({ kind: 'packing' }, (packing) => qualified('Packing the images', packing))
    .with({ kind: 'opening' }, (opening) => `Opening ${sourceNoun(opening.sourceKind)}`)
    .with({ kind: 'storing' }, (storing) => qualified('Storing the source', storing))
    .with({ kind: 'covering' }, () => 'Rendering the cover')
    .exhaustive();
}
