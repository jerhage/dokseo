import { match } from 'ts-pattern';
import type { FileSaving, FileSharing } from '$lib/platform/files/save-file';

type ShareSupport = 'none' | 'no-files' | 'files';

type SheetEnding = 'saved' | 'dismissed' | 'activation-lost';

type SaveRehearsal = {
  readonly touchDevice: boolean;
  readonly support: ShareSupport;
  readonly ending: SheetEnding;
};

type SaveStep =
  | { readonly kind: 'can-share'; readonly file: string; readonly answer: boolean }
  | { readonly kind: 'share'; readonly file: string; readonly ending: ShareEnding }
  | { readonly kind: 'download'; readonly file: string };

type ShareEnding = 'resolved' | 'AbortError' | 'NotAllowedError';

type StepLog = { readonly add: (step: SaveStep) => void };

const SHARE_SUPPORTS: readonly { readonly value: ShareSupport; readonly label: string }[] = [
  { value: 'none', label: 'No navigator.share' },
  { value: 'no-files', label: 'share, but canShare refuses the file' },
  { value: 'files', label: 'share, and canShare accepts the file' },
];

const SHEET_ENDINGS: readonly { readonly value: SheetEnding; readonly label: string }[] = [
  { value: 'saved', label: 'The reader picks Save to Files' },
  { value: 'dismissed', label: 'The reader closes the sheet' },
  { value: 'activation-lost', label: 'The tap was used up before share()' },
];

function isShareSupport(value: string): value is ShareSupport {
  return SHARE_SUPPORTS.some((option) => option.value === value);
}

function isSheetEnding(value: string): value is SheetEnding {
  return SHEET_ENDINGS.some((option) => option.value === value);
}

function fileNames(data: ShareData): string {
  return (data.files ?? []).map((file) => file.name).join(', ');
}

function shareEnding(ending: SheetEnding, secondTap: boolean): ShareEnding {
  return match(ending)
    .returnType<ShareEnding>()
    .with('saved', () => 'resolved')
    .with('dismissed', () => 'AbortError')
    .with('activation-lost', () => (secondTap ? 'resolved' : 'NotAllowedError'))
    .exhaustive();
}

function rehearsedSaving(rehearsal: () => SaveRehearsal, log: StepLog): FileSaving {
  let secondTap = false;
  const sharing: FileSharing = {
    canShare: (data) => {
      const answer = rehearsal().support === 'files';
      log.add({ kind: 'can-share', file: fileNames(data), answer });
      return answer;
    },
    share: (data) => {
      const ending = shareEnding(rehearsal().ending, secondTap);
      secondTap = ending === 'NotAllowedError';
      log.add({ kind: 'share', file: fileNames(data), ending });
      if (ending === 'resolved') return Promise.resolve();
      return Promise.reject(new DOMException('Rehearsed refusal', ending));
    },
  };
  return {
    get touchDevice() {
      return rehearsal().touchDevice;
    },
    get sharing() {
      return rehearsal().support === 'none' ? null : sharing;
    },
    download: (file) => log.add({ kind: 'download', file: file.name }),
  };
}

function stepText(step: SaveStep): string {
  return match(step)
    .with({ kind: 'can-share' }, ({ file, answer }) => `canShare({ files: [${file}] }) → ${answer}`)
    .with(
      { kind: 'share', ending: 'resolved' },
      ({ file }) => `share({ files: [${file}] }) resolved`,
    )
    .with(
      { kind: 'share', ending: 'AbortError' },
      { kind: 'share', ending: 'NotAllowedError' },
      ({ file, ending }) => `share({ files: [${file}] }) rejected with ${ending}`,
    )
    .with({ kind: 'download' }, ({ file }) => `download(${file}): a link with download clicked`)
    .exhaustive();
}

export {
  SHARE_SUPPORTS,
  SHEET_ENDINGS,
  isSheetEnding,
  isShareSupport,
  rehearsedSaving,
  shareEnding,
  stepText,
};
export type { SaveRehearsal, SaveStep, ShareEnding, ShareSupport, SheetEnding, StepLog };
