import { describe, expect, it } from 'vitest';
import { fileItemView } from './file-item';

const BASE = { id: 'a', name: 'profile-photo.jpg', size: 422_707 } as const;

describe('fileItemView', () => {
  it('shows the size of a pending file with no state class, a file mark and a remove action', () => {
    expect(fileItemView({ ...BASE, state: 'pending' })).toEqual({
      classes: [],
      mark: 'file',
      detail: { kind: 'size', text: '412.8 KB' },
      removal: 'remove',
    });
  });

  it('shows the progress of an uploading file in place of its size and offers to cancel', () => {
    expect(fileItemView({ ...BASE, state: 'uploading', progress: 58 })).toEqual({
      classes: [],
      mark: 'file',
      detail: { kind: 'progress', value: 58 },
      removal: 'cancel',
    });
  });

  it('marks a complete file with the complete mark and still shows its size', () => {
    expect(fileItemView({ ...BASE, state: 'complete' })).toEqual({
      classes: ['is-complete'],
      mark: 'complete',
      detail: { kind: 'size', text: '412.8 KB' },
      removal: 'remove',
    });
  });

  it('marks a failed file with the error mark and shows its message in place of its size', () => {
    expect(fileItemView({ ...BASE, state: 'error', message: 'File type not allowed' })).toEqual({
      classes: ['is-error'],
      mark: 'error',
      detail: { kind: 'message', text: 'File type not allowed' },
      removal: 'remove',
    });
  });
});
