import { describe, expect, it } from 'vitest';
import { modalHeading, modalLabelledBy } from './modal-heading';

const HEADER = (): void => {};

describe('modalHeading', () => {
  it.each([
    [
      'the title row when a title is given',
      'Delete?',
      undefined,
      { kind: 'title', title: 'Delete?' },
    ],
    ['the title row over a header', 'Delete?', HEADER, { kind: 'title', title: 'Delete?' }],
    [
      'the caller header in place of the title row',
      undefined,
      HEADER,
      { kind: 'custom', header: HEADER },
    ],
    ['no header when neither is given', undefined, undefined, { kind: 'none' }],
  ])('draws %s', (_case, title, header, heading) => {
    expect(modalHeading(title, header)).toEqual(heading);
  });
});

describe('modalLabelledBy', () => {
  it('names the dialog by its title', () => {
    expect(modalLabelledBy(modalHeading('Delete?', undefined), 'm-title', 'other')).toBe('m-title');
  });

  it('passes the caller label through when a custom header replaces the title', () => {
    expect(modalLabelledBy(modalHeading(undefined, HEADER), 'm-title', 'search-label')).toBe(
      'search-label',
    );
  });

  it('points at no missing title element in a headerless dialog', () => {
    expect(modalLabelledBy(modalHeading(undefined, undefined), 'm-title', undefined)).toBe(
      undefined,
    );
    expect(modalLabelledBy(modalHeading(undefined, undefined), 'm-title', null)).toBe(undefined);
  });
});
