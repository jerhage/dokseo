import type { SourceSnippet } from '../ocr/ocr-snippets';

const CAPTURES_FILE_TYPE: SourceSnippet = {
  label: 'The version 1 file',
  file: 'src/lib/domains/storage/use-cases/captures-file.ts',
  code: `type CapturesFile = {
  readonly format: typeof CAPTURES_FILE_FORMAT;
  readonly version: typeof CAPTURES_FILE_VERSION;
  readonly exportedAt: number;
  readonly appVersion: string;
  readonly books: readonly (FileBook | RetiredFileBook)[];
  readonly tags: readonly Tag[];
  readonly captures: readonly FileCapture[];
  readonly unreadable?: UnreadableSection;
};`,
};

const READ_FILE: SourceSnippet = {
  label: 'Reading the whole file',
  file: 'src/lib/domains/storage/use-cases/read-captures-file.ts',
  code: `function readCapturesFile(text: string): ReadCapturesFileResult {
  const file = parsed(text);
  if (!isStoredFields(file) || file.format !== CAPTURES_FILE_FORMAT) return NOT_AN_EXPORT;

  return match(file.version)
    .with(CAPTURES_FILE_VERSION, () => {
      const sections = sectionsOf(file);
      return sections === null ? NOT_AN_EXPORT : readSections(sections);
    })
    .with(P.number.int().gt(CAPTURES_FILE_VERSION), (version): ReadCapturesFileResult => ({
      kind: 'newer-version',
      version,
    }))
    .otherwise(() => NOT_AN_EXPORT);
}`,
};

const FILE_CAPTURE: SourceSnippet = {
  label: 'Reading one capture entry',
  file: 'src/lib/domains/storage/use-cases/read-captures-file.ts',
  code: `function fileCapture(entry: unknown): { readonly bookKey: string; readonly capture: Capture } {
  const capture = fields('capture', entry);
  const bookKey = field('capture', 'book key', capture.bookKey, isKey);
  return { bookKey, capture: captureFromStored({ ...capture, bookId: bookKey }) };
}`,
};

const BOOK_MATCH: SourceSnippet = {
  label: 'Matching a file book to this device',
  file: 'src/lib/domains/storage/use-cases/captures-import-plan.ts',
  code: `function bookMatch(file: FileBook, holdings: LocalHoldings, minting: PlanMinting): BookMatch {
  const probe = probeOf(file);
  const onShelf = shelfMatch(holdings.shelf, probe);
  if (onShelf !== null) return { kind: 'shelf', book: onShelf };
  const restorable = restorableMatch(holdings.restorable, probe);
  if (restorable !== null) return { kind: 'restorable', book: restorable };
  return { kind: 'absent', record: absentRecord(file, minting) };
}`,
};

const PLAN_TAGS: SourceSnippet = {
  label: 'Merging tags by name',
  file: 'src/lib/domains/storage/use-cases/captures-import-plan.ts',
  code: `function planTags(
  fileTags: readonly Tag[],
  holdings: LocalHoldings,
  minting: PlanMinting,
): readonly PlannedTag[] {
  const known: Tag[] = [...holdings.tags];
  const taken = new Set<TagId>([
    ...holdings.tags.map((tag) => tag.id),
    ...holdings.unreadableTagIds,
  ]);
  return fileTags.map((file): PlannedTag => {
    const into = known.find((tag) => sameTagName(tag.name, file.name));
    if (into !== undefined) return { kind: 'merged', file, into };
    const tag: Tag = { ...file, id: taken.has(file.id) ? tagId(minting.newId()) : file.id };
    known.push(tag);
    taken.add(tag.id);
    return { kind: 'created', file, tag };
  });
}`,
};

const PLAN_CAPTURE: SourceSnippet = {
  label: 'Classing one capture',
  file: 'src/lib/domains/storage/use-cases/captures-import-plan.ts',
  code: `function planCapture(
  entry: ReadCapture,
  target: CaptureTarget,
  held: ReadonlyMap<CaptureId, Capture>,
  mapping: ReadonlyMap<TagId, TagId>,
): PlannedCapture {
  const fileTags = remapped(entry.capture.tagIds, mapping);
  const device = held.get(entry.capture.id);
  if (device === undefined) {
    return {
      kind: 'new',
      capture: placed(entry.capture, target.id, fileTags),
      onShelf: target.onShelf,
    };
  }

  const onAnotherBook = device.bookId !== target.id;
  const tagIds = tagUnion(device.tagIds, fileTags);
  if (!sameContent(device, entry.capture)) {
    const file = placed(entry.capture, device.bookId, fileTags);
    return {
      kind: 'conflict',
      conflict: { id: device.id, book: target.book, device, file, tagIds, onAnotherBook },
    };
  }
  if (tagIds.length === device.tagIds.length) {
    return { kind: 'identical', id: device.id, onAnotherBook };
  }
  return { kind: 'tags-only', capture: { ...device, tagIds }, onAnotherBook };
}`,
};

const NEWER_SIDE: SourceSnippet = {
  label: 'Keep the newer edit',
  file: 'src/lib/domains/storage/use-cases/apply-captures-import.ts',
  code: `function lastChanged(capture: Capture): number {
  return capture.editedAt ?? capture.createdAt;
}

function newerSide(conflict: CaptureConflict): ConflictChoice {
  return lastChanged(conflict.file) > lastChanged(conflict.device) ? FILE : DEVICE;
}`,
};

const APPLY_IMPORT: SourceSnippet = {
  label: 'Writing an import',
  file: 'src/lib/domains/storage/use-cases/apply-captures-import.ts',
  code: `async function applyCapturesImport(
  deps: ApplyCapturesImportDeps,
  plan: CapturesImportPlan,
  resolution: ConflictResolution,
): Promise<ApplyCapturesImportResult> {
  for (const record of plan.records) {
    const added = await addRemovedBook(deps.holding, record);
    if (added.kind !== 'success') return added;
  }

  const created = plan.tags.flatMap((planned) => (planned.kind === 'created' ? [planned.tag] : []));
  for (const tag of created) {
    const restored = await restoreTag(deps.tagging, tag);
    if (restored.kind !== 'success') return restored;
  }

  const outcomes = plan.captures.map((planned) => outcomeOf(planned, resolution, deps.now));
  for (const outcome of outcomes) {
    const capture = writtenCapture(outcome);
    if (capture === null) continue;
    const saved = await restoreCapture(deps.saving, capture);
    if (saved.kind !== 'success') return saved;
  }

  return { kind: 'imported', counts: countsOf(outcomes, created.length) };
}`,
};

const SAVE_FILE: SourceSnippet = {
  label: 'Choosing the share sheet or a download',
  file: 'src/lib/platform/files/save-file.ts',
  code: `async function saveFile(saving: FileSaving, toSave: FileToSave): Promise<SaveFileOutcome> {
  const file = new File([toSave.text], toSave.name, { type: toSave.type });
  const data: ShareData = { files: [file] };
  const sharing = saving.sharing;
  if (sharing === null || !saving.touchDevice || !sharing.canShare(data)) {
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
}`,
};

const BROWSER_DOWNLOAD: SourceSnippet = {
  label: 'The download',
  file: 'src/lib/platform/files/save-file.ts',
  code: `function browserDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}`,
};

const PREPARED_ON_TICK: SourceSnippet = {
  label: 'Building the file on the tick',
  file: 'src/lib/domains/library/ui/RemoveBook.svelte',
  code: `function chooseRemoval(next: boolean): void {
  removal = removalChosen(next);
  if (removal === 'delete-captures') void capturesExport.ensurePrepared(book.id);
}`,
};

const RAW_STATE: SourceSnippet = {
  label: 'The import state, held raw',
  file: 'src/lib/domains/storage/ui/captures-import.svelte.ts',
  code: `class CapturesImportView {
  #state = $state.raw<CapturesImportState>(IDLE);`,
};

const EXPORT_IMPORT_SNIPPETS: readonly SourceSnippet[] = [
  CAPTURES_FILE_TYPE,
  READ_FILE,
  FILE_CAPTURE,
  BOOK_MATCH,
  PLAN_TAGS,
  PLAN_CAPTURE,
  NEWER_SIDE,
  APPLY_IMPORT,
  SAVE_FILE,
  BROWSER_DOWNLOAD,
  PREPARED_ON_TICK,
  RAW_STATE,
];

export {
  APPLY_IMPORT,
  BOOK_MATCH,
  BROWSER_DOWNLOAD,
  CAPTURES_FILE_TYPE,
  EXPORT_IMPORT_SNIPPETS,
  FILE_CAPTURE,
  NEWER_SIDE,
  PLAN_CAPTURE,
  PLAN_TAGS,
  PREPARED_ON_TICK,
  RAW_STATE,
  READ_FILE,
  SAVE_FILE,
};
