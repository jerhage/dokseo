type FileToSave = {
  readonly text: string;
  readonly name: string;
  readonly type: string;
};

type SaveFileOutcome =
  | { readonly kind: 'shared' }
  | { readonly kind: 'downloaded' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'needs-another-tap' };

type ShareRefusal = Extract<SaveFileOutcome, { kind: 'cancelled' | 'needs-another-tap' }>;

type FileSharing = {
  readonly canShare: (data: ShareData) => boolean;
  readonly share: (data: ShareData) => Promise<void>;
};

type FileSaving = {
  readonly sharing: FileSharing | null;
  readonly download: (file: File) => void;
};

const SHARED: SaveFileOutcome = { kind: 'shared' };

const DOWNLOADED: SaveFileOutcome = { kind: 'downloaded' };

const REFUSALS: Readonly<Record<string, ShareRefusal>> = {
  AbortError: { kind: 'cancelled' },
  NotAllowedError: { kind: 'needs-another-tap' },
};

const REVOKE_AFTER_MS = 40_000;

function shareRefusal(error: unknown): ShareRefusal | null {
  if (!(error instanceof DOMException)) return null;
  return REFUSALS[error.name] ?? null;
}

async function saveFile(saving: FileSaving, toSave: FileToSave): Promise<SaveFileOutcome> {
  const file = new File([toSave.text], toSave.name, { type: toSave.type });
  const data: ShareData = { files: [file] };
  const sharing = saving.sharing;
  if (sharing === null || !sharing.canShare(data)) {
    saving.download(file);
    return DOWNLOADED;
  }

  try {
    await sharing.share(data);
    return SHARED;
  } catch (error) {
    const refusal = shareRefusal(error);
    if (refusal === null) throw error;
    return refusal;
  }
}

function browserSharing(): FileSharing | null {
  if (typeof navigator === 'undefined') return null;
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') {
    return null;
  }

  return {
    canShare: (data) => navigator.canShare(data),
    share: (data) => navigator.share(data),
  };
}

function browserDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

function browserFileSaving(): FileSaving {
  return { sharing: browserSharing(), download: browserDownload };
}

export { browserFileSaving, saveFile, shareRefusal };
export type { FileSaving, FileSharing, FileToSave, SaveFileOutcome };
