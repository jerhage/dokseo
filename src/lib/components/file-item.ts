import { match } from 'ts-pattern';
import type { ClassList } from './classes';
import { formatFileSize } from './file-selection';

type FileItemState =
  | { readonly state: 'pending' }
  | { readonly state: 'uploading'; readonly progress: number }
  | { readonly state: 'complete' }
  | { readonly state: 'error'; readonly message: string };

type FileItemData = FileItemState & {
  readonly id: string;
  readonly name: string;
  readonly size: number;
};

type FileItemDetail =
  | { readonly kind: 'size'; readonly text: string }
  | { readonly kind: 'progress'; readonly value: number }
  | { readonly kind: 'message'; readonly text: string };

type FileItemMark = 'file' | 'complete' | 'error';

type FileItemView = {
  readonly classes: ClassList;
  readonly mark: FileItemMark;
  readonly detail: FileItemDetail;
  readonly removal: 'remove' | 'cancel';
};

function fileItemView(item: FileItemData): FileItemView {
  const size: FileItemDetail = { kind: 'size', text: formatFileSize(item.size) };
  return match<FileItemState, FileItemView>(item)
    .with({ state: 'pending' }, () => ({
      classes: [],
      mark: 'file',
      detail: size,
      removal: 'remove',
    }))
    .with({ state: 'uploading' }, ({ progress }) => ({
      classes: [],
      mark: 'file',
      detail: { kind: 'progress', value: progress },
      removal: 'cancel',
    }))
    .with({ state: 'complete' }, () => ({
      classes: ['is-complete'],
      mark: 'complete',
      detail: size,
      removal: 'remove',
    }))
    .with({ state: 'error' }, ({ message }) => ({
      classes: ['is-error'],
      mark: 'error',
      detail: { kind: 'message', text: message },
      removal: 'remove',
    }))
    .exhaustive();
}

export { fileItemView };
export type { FileItemData, FileItemDetail, FileItemMark, FileItemState, FileItemView };
