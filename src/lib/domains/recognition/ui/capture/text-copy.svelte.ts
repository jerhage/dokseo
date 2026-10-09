import { onDestroy } from 'svelte';
import { describeCause } from '$lib/shared/cause';
import type { CaptureId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';

type ClipboardWrite = (text: string) => Promise<void>;

type CopyOutcome = { readonly ok: true } | { readonly ok: false; readonly reason: string };

const COPIED_FOR = 1500;

function createTextCopy(write: ClipboardWrite, notify: Notify) {
  let copied = $state.raw<CaptureId | null>(null);
  let told = $state('');
  const marks = new Set<ReturnType<typeof setTimeout>>();

  onDestroy(() => {
    for (const mark of marks) clearTimeout(mark);
    marks.clear();
  });

  return {
    get copied(): CaptureId | null {
      return copied;
    },
    get told(): string {
      return told;
    },
    async copy(capture: CaptureId, text: string): Promise<void> {
      const outcome = await write(text).then(
        (): CopyOutcome => ({ ok: true }),
        (cause: unknown): CopyOutcome => ({ ok: false, reason: describeCause(cause) }),
      );

      if (!outcome.ok) {
        told = '';
        notify({
          tone: 'danger',
          title: 'The text could not be copied',
          message: outcome.reason,
        });
        return;
      }

      told = 'Copied the text';
      copied = capture;
      const mark = setTimeout(() => {
        marks.delete(mark);
        if (copied === capture) copied = null;
      }, COPIED_FOR);
      marks.add(mark);
    },
  };
}

type TextCopyHook = ReturnType<typeof createTextCopy>;

export { COPIED_FOR, createTextCopy };
export type { ClipboardWrite, TextCopyHook };
