import { describe, expect, it } from 'vitest';
import { removalWarning, tagRemoval } from './tag-removal';

describe('tagRemoval', () => {
  it('names a tag nothing carries', () => {
    expect(tagRemoval('sfx', 0)).toEqual({ kind: 'unused', name: 'sfx' });
  });

  it('names a tag one capture carries', () => {
    expect(tagRemoval('sfx', 1)).toEqual({ kind: 'single', name: 'sfx' });
  });

  it('names a tag several captures carry', () => {
    expect(tagRemoval('sfx', 12)).toEqual({ kind: 'several', name: 'sfx', captures: 12 });
  });

  it('reads a negative count as a tag nothing carries', () => {
    expect(tagRemoval('sfx', -1)).toEqual({ kind: 'unused', name: 'sfx' });
  });
});

describe('removalWarning', () => {
  it('says nothing carries the tag when no capture does', () => {
    const warning = removalWarning({ kind: 'unused', name: 'sfx' });

    expect(warning).toContain('Delete sfx?');
    expect(warning).toContain('Nothing carries it');
  });

  it('says one capture, not 1 captures', () => {
    const warning = removalWarning({ kind: 'single', name: 'sfx' });

    expect(warning).toContain('One capture loses the tag');
    expect(warning).not.toContain('captures');
  });

  it('counts the captures that lose the tag', () => {
    const warning = removalWarning({ kind: 'several', name: 'keigo', captures: 12 });

    expect(warning).toContain('Delete keigo?');
    expect(warning).toContain('12 captures lose the tag');
  });

  it('promises the one capture itself survives, because only the tag goes', () => {
    expect(removalWarning({ kind: 'single', name: 'sfx' })).toContain('The capture itself is kept');
  });

  it('promises the captures themselves survive, because only the tag goes', () => {
    expect(removalWarning({ kind: 'several', name: 'sfx', captures: 4 })).toContain(
      'The captures themselves are kept',
    );
  });
});
