import { describe, expect, it } from 'vitest';
import { CatalogSession } from './catalog-session.svelte';
import { DEVICE_TAB } from './library-tabs';

describe('CatalogSession', () => {
  it('starts at the root of the device tab', () => {
    const session = new CatalogSession();

    expect(session.navigation.current.tab).toBe(DEVICE_TAB);
  });

  it('remembers a selection and a scroll position for each place', () => {
    const session = new CatalogSession();

    session.keepSelection('p1', new Set(['a']));
    session.keepScroll('p1', 320);

    expect([...session.selectionOf('p1')]).toEqual(['a']);
    expect(session.scrollOf('p1')).toBe(320);
    expect(session.selectionOf('p2').size).toBe(0);
    expect(session.scrollOf('p2')).toBe(0);
  });

  it('forgets what it kept for one place and leaves the others', () => {
    const session = new CatalogSession();
    session.keepSelection('p1', new Set(['a']));
    session.keepScroll('p1', 320);
    session.keepSelection('p2', new Set(['b']));
    session.keepReading('p1', { kind: 'failed' });

    session.forgetPlace('p1');

    expect(session.selectionOf('p1').size).toBe(0);
    expect(session.scrollOf('p1')).toBe(0);
    expect(session.readings.has('p1')).toBe(false);
    expect([...session.selectionOf('p2')]).toEqual(['b']);
  });

  it('forgets everything it kept when it restarts', () => {
    const session = new CatalogSession();
    session.keepSelection('p1', new Set(['a']));
    session.keepReading('p1', { kind: 'failed' });

    session.restart('home');

    expect(session.navigation.current.tab).toBe('home');
    expect(session.selectionOf('p1').size).toBe(0);
    expect(session.readings.size).toBe(0);
  });
});
