import { megabytes, storedSize } from '$lib/shared/bytes';
import { isStored } from '../../domain/model/model-cache';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { PartialReport } from '../../domain/model/model-partial';
import type { DownloadState } from '../../domain/model/model-download';
import type { ModelLoad } from '../../domain/model/model-load';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { EngineState } from '../../domain/engine/ocr-engine';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { isModelStored, isResumable } from './model-storage';

const FULL_PERCENT = 100;

function loadFigure(load: ModelLoad | null): string {
  if (load === null) return 'starting…';

  const percent = Math.round(load.fraction * FULL_PERCENT);
  if (load.totalBytes <= 0) return `${percent}%`;

  return `${megabytes(load.loadedBytes)} / ${megabytes(load.totalBytes)} MB · ${percent}%`;
}

function cancelHint(load: ModelLoad | null): string {
  return load?.source === 'network'
    ? 'Pausing keeps every byte already fetched, even if you close the app. Cancelling discards the part-downloaded file.'
    : 'The weights stay on this device. Cancelling only stops opening them.';
}

function partialFigure(partial: PartialReport | null, stored = false): string | null {
  if (partial === null || !isPartlyDownloaded(partial)) return null;

  const files = `${partial.files} ${partial.files === 1 ? 'file' : 'files'}`;
  const held = `${megabytes(partial.bytes)} MB of ${files} part-downloaded`;

  return stored
    ? `${held}, left over from an earlier download and no longer needed`
    : `${held}, kept for a resume`;
}

function resumeLabel(partial: PartialReport | null): string {
  return partial !== null && isPartlyDownloaded(partial)
    ? `Resume the download · ${megabytes(partial.bytes)} MB already here`
    : 'Resume the download';
}

function storedFigure(report: ModelStorageReport): string {
  if (report.files === 0) return 'Not downloaded';

  const files = `${report.files} ${report.files === 1 ? 'file' : 'files'}`;
  const unsized = report.unsized > 0 ? `, ${report.unsized} of unreported size` : '';
  const held = `${storedSize(report.bytes)} in ${files}${unsized}`;

  return isStored(report) ? held : `${held}, but not the weights`;
}

function engineStateOf(
  download: DownloadState,
  session: RecognizerSession | null,
  storage: ModelStorageSnapshot | null,
): EngineState {
  return {
    stored: isModelStored(storage),
    opening: download.kind === 'loading',
    load: download.kind === 'loading' ? download.load : null,
    session: download.kind === 'ready' ? download.session : session,
    failure: download.kind === 'failed' ? download.cause : null,
    paused: download.kind === 'paused',
    cancelled: download.kind === 'cancelled',
    partlyDownloaded: isResumable(storage),
  };
}

export { cancelHint, engineStateOf, loadFigure, partialFigure, resumeLabel, storedFigure };
