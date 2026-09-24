import { describe, expect, it } from 'vitest';
import { modalHeading, modalLabelledBy } from './modal-heading';

const HEADER = (): void => {};

describe('modalHeading', () => {
  it('draws the title row when a title is given', () => {
    expect(modalHeading('Delete?', undefined)).toEqual({ kind: 'title', title: 'Delete?' });
  });

  it('prefers the title row over a header', () => {
    expect(modalHeading('Delete?', HEADER)).toEqual({ kind: 'title', title: 'Delete?' });
  });

  it('draws the caller header in place of the title row', () => {
    expect(modalHeading(undefined, HEADER)).toEqual({ kind: 'custom', header: HEADER });
  });

  it('draws no header when neither is given', () => {
    expect(modalHeading(undefined, undefined)).toEqual({ kind: 'none' });
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
