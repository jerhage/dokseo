import { describe, expect, it } from 'vitest';
import { NO_UPLOAD_NAME, uploadName } from './upload-name';

describe('uploadName', () => {
  it('names a single file by its own name, extension included', () => {
    expect(uploadName([{ name: 'Yotsuba&! 1.cbz', webkitRelativePath: '' }])).toBe(
      'Yotsuba&! 1.cbz',
    );
  });

  it('names a lone file by its name even when it came from a folder', () => {
    expect(uploadName([{ name: '001.png', webkitRelativePath: 'Ch 12/001.png' }])).toBe('001.png');
  });

  it('names a folder of files by the folder they share', () => {
    expect(
      uploadName([
        { name: '001.png', webkitRelativePath: 'Ch 12/001.png' },
        { name: '002.png', webkitRelativePath: 'Ch 12/inner/002.png' },
      ]),
    ).toBe('Ch 12');
  });

  it('gives no name to loose files that share no folder', () => {
    expect(
      uploadName([
        { name: '001.png', webkitRelativePath: '' },
        { name: '002.png', webkitRelativePath: '' },
      ]),
    ).toBe(NO_UPLOAD_NAME);
  });

  it('gives no name to files from two different folders', () => {
    expect(
      uploadName([
        { name: '001.png', webkitRelativePath: 'Ch 12/001.png' },
        { name: '002.png', webkitRelativePath: 'Ch 13/002.png' },
      ]),
    ).toBe(NO_UPLOAD_NAME);
  });

  it('gives no name to an empty upload', () => {
    expect(uploadName([])).toBe(NO_UPLOAD_NAME);
  });

  it('composes a decomposed name, so the same name typed on two systems is one name', () => {
    expect(uploadName([{ name: 'パン.cbz', webkitRelativePath: '' }])).toBe('パン.cbz');
  });
});
