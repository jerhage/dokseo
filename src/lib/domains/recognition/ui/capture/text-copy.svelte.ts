import { describeCause } from '$lib/shared/cause';
import type { CaptureId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';

type ClipboardWrite = (text: string) => Promise<void>;

type CopyOutcome = { readonly ok: true } | { readonly ok: false; readonly reason: string };

const COPIED_FOR = 1500;

class TextCopy {
  copied = $state.raw<CaptureId | null>(null);
  told = $state('');

  #write: ClipboardWrite;
  #notify: Notify;

  constructor(write: ClipboardWrite, notify: Notify) {
    this.#write = write;
    this.#notify = notify;
  }

  async copy(capture: CaptureId, text: string): Promise<void> {
    const outcome = await this.#write(text).then(
      (): CopyOutcome => ({ ok: true }),
      (cause: unknown): CopyOutcome => ({ ok: false, reason: describeCause(cause) }),
    );

    if (!outcome.ok) {
      this.told = '';
      this.#notify({
        tone: 'danger',
        title: 'The text could not be copied',
        message: outcome.reason,
      });
      return;
    }

    this.told = 'Copied the text';
    this.copied = capture;
    setTimeout(() => {
      if (this.copied === capture) this.copied = null;
    }, COPIED_FOR);
  }
}

export { COPIED_FOR, TextCopy };
export type { ClipboardWrite };
