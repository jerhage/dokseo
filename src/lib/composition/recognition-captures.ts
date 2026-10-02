import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type {
  Capture,
  CaptureDraft,
  NotableCapture,
} from '../domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import { clearCaptures } from '../domains/recognition/use-cases/capture/clear-captures';
import type { ClearCapturesResult } from '../domains/recognition/use-cases/capture/clear-captures';
import { editCaptureText } from '../domains/recognition/use-cases/capture/edit-capture-text';
import type { EditCaptureTextResult } from '../domains/recognition/use-cases/capture/edit-capture-text';
import { listCaptures } from '../domains/recognition/use-cases/capture/list-captures';
import type { ListCapturesResult } from '../domains/recognition/use-cases/capture/list-captures';
import { listEveryCapture } from '../domains/recognition/use-cases/capture/list-every-capture';
import type { ListEveryCaptureResult } from '../domains/recognition/use-cases/capture/list-every-capture';
import { removeCapture } from '../domains/recognition/use-cases/capture/remove-capture';
import type { RemoveCaptureResult } from '../domains/recognition/use-cases/capture/remove-capture';
import { restoreCapture } from '../domains/recognition/use-cases/capture/restore-capture';
import type { RestoreCaptureResult } from '../domains/recognition/use-cases/capture/restore-capture';
import { saveCapture } from '../domains/recognition/use-cases/capture/save-capture';
import type { SaveCaptureResult } from '../domains/recognition/use-cases/capture/save-capture';
import { writeCaptureNote } from '../domains/recognition/use-cases/capture/write-capture-note';
import type { WriteCaptureNoteResult } from '../domains/recognition/use-cases/capture/write-capture-note';
import { writeNote } from '../domains/recognition/use-cases/capture/write-note';
import type { WriteNoteResult } from '../domains/recognition/use-cases/capture/write-note';

type CaptureUseCases = {
  readonly listCaptures: (book: BookId) => Promise<ListCapturesResult>;
  readonly listEveryCapture: () => Promise<ListEveryCaptureResult>;
  readonly saveCapture: (draft: CaptureDraft) => Promise<SaveCaptureResult>;
  readonly writeNote: (id: CaptureId, book: BookId, anchor: Anchor) => Promise<WriteNoteResult>;
  readonly editCaptureText: (capture: Capture, text: string) => Promise<EditCaptureTextResult>;
  readonly writeCaptureNote: <T extends NotableCapture>(
    capture: T,
    note: string,
  ) => Promise<WriteCaptureNoteResult<T>>;
  readonly removeCapture: (capture: CaptureId) => Promise<RemoveCaptureResult>;
  readonly restoreCapture: (capture: Capture) => Promise<RestoreCaptureResult>;
  readonly clearCaptures: (book: BookId) => Promise<ClearCapturesResult>;
};

function buildCaptures(captures: CaptureRepository): CaptureUseCases {
  return {
    listCaptures: (book: BookId) => listCaptures({ captures }, book),
    listEveryCapture: () => listEveryCapture({ captures }),
    saveCapture: (draft: CaptureDraft) => saveCapture({ captures, now: Date.now }, draft),
    writeNote: (id: CaptureId, book: BookId, anchor: Anchor) =>
      writeNote({ captures, now: Date.now }, id, book, anchor),
    editCaptureText: (capture: Capture, text: string) =>
      editCaptureText({ captures, now: Date.now }, capture, text),
    writeCaptureNote: <T extends NotableCapture>(capture: T, note: string) =>
      writeCaptureNote({ captures }, capture, note),
    removeCapture: (capture: CaptureId) => removeCapture({ captures }, capture),
    restoreCapture: (capture: Capture) => restoreCapture({ captures }, capture),
    clearCaptures: (book: BookId) => clearCaptures({ captures }, book),
  };
}

export { buildCaptures };
export type { CaptureUseCases };
