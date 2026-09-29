import type { SourceKind } from '../book/book';
import { extensionOf } from './entry-path';
import { isJunk, isPageImage } from './image-entries';
import { compareNatural } from './natural-order';

type UploadEntry = {
  readonly name: string;
  readonly webkitRelativePath: string;
};

type UploadBook<F extends UploadEntry> = {
  readonly sourceKind: SourceKind;
  readonly files: readonly F[];
};

type ContainerKind = Exclude<SourceKind, 'images'>;

type ContainerFile<F extends UploadEntry> = {
  readonly file: F;
  readonly sourceKind: ContainerKind;
};

function containerKind(name: string): ContainerKind | null {
  const extension = extensionOf(name);
  if (extension === 'pdf') return 'pdf';
  if (extension === 'zip' || extension === 'cbz') return 'archive';
  if (extension === 'epub') return 'epub';
  return null;
}

function detectSourceKind(names: readonly string[]): SourceKind | null {
  const [single] = names;
  if (names.length === 1 && single !== undefined && !isJunk(single)) {
    const only = containerKind(single);
    if (only !== null) return only;
  }
  if (names.some(isPageImage)) return 'images';
  return null;
}

function pathOf(entry: UploadEntry): string {
  return entry.webkitRelativePath.length > 0 ? entry.webkitRelativePath : entry.name;
}

function uploadContainerKind(entry: UploadEntry): ContainerKind | null {
  const path = pathOf(entry);
  if (isJunk(path)) return null;
  return containerKind(path);
}

function splitUpload<F extends UploadEntry>(files: readonly F[]): readonly UploadBook<F>[] {
  const containers: ContainerFile<F>[] = [];
  const rest: F[] = [];
  for (const file of files) {
    const sourceKind = uploadContainerKind(file);
    if (sourceKind === null) rest.push(file);
    else containers.push({ file, sourceKind });
  }

  const books = containers
    .toSorted((a, b) => compareNatural(pathOf(a.file), pathOf(b.file)))
    .map(({ file, sourceKind }): UploadBook<F> => ({ sourceKind, files: [file] }));
  if (!rest.some((file) => isPageImage(pathOf(file)))) return books;

  return [...books, { sourceKind: 'images', files: rest }];
}

export { detectSourceKind, splitUpload };
export type { UploadBook, UploadEntry };
