import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { CatalogSession } from './catalog-session.svelte';
import { ROOT_POSITION, opened } from './feed-address';

const ID = catalogId('home');
const DEEP = opened(ROOT_POSITION, { title: 'By Series', href: 'https://home.test/series' });
const DEEPER = opened(DEEP, { title: 'Star', href: 'https://home.test/star' });

describe('CatalogSession feed trail', () => {
  it('starts at the root with the first trail index', () => {
    const session = new CatalogSession();
    expect(session.positionOf(ID)).toBe(ROOT_POSITION);
    expect(session.trailIndexOf(ID)).toBe(0);
  });

  it('moves the current entry in place', () => {
    const session = new CatalogSession();
    session.move(ID, DEEP);
    expect(session.positionOf(ID)).toBe(DEEP);
    expect(session.trailIndexOf(ID)).toBe(0);
  });

  it('keeps the position left behind when it advances', () => {
    const session = new CatalogSession();
    session.advance(ID);
    session.move(ID, DEEP);
    expect(session.trailIndexOf(ID)).toBe(1);
    expect(session.seek(ID, 0)?.position).toBe(ROOT_POSITION);
  });

  it('seeks an earlier entry and reports the one before it', () => {
    const session = new CatalogSession();
    session.advance(ID);
    session.move(ID, DEEP);
    session.advance(ID);
    session.move(ID, DEEPER);
    expect(session.seek(ID, 1)).toEqual({ position: DEEP, before: ROOT_POSITION });
    expect(session.positionOf(ID)).toBe(DEEP);
    expect(session.trailIndexOf(ID)).toBe(1);
  });

  it('seeks a later entry after seeking an earlier one', () => {
    const session = new CatalogSession();
    session.advance(ID);
    session.move(ID, DEEP);
    session.seek(ID, 0);
    expect(session.seek(ID, 1)?.position).toBe(DEEP);
  });

  it('drops the entries after the current one when it advances', () => {
    const session = new CatalogSession();
    session.advance(ID);
    session.move(ID, DEEP);
    session.seek(ID, 0);
    session.advance(ID);
    expect(session.seek(ID, 2)).toBeNull();
    expect(session.trailIndexOf(ID)).toBe(1);
  });

  it('seeks nothing outside the trail and stays where it is', () => {
    const session = new CatalogSession();
    session.move(ID, DEEP);
    expect(session.seek(ID, 3)).toBeNull();
    expect(session.seek(ID, -1)).toBeNull();
    expect(session.positionOf(ID)).toBe(DEEP);
  });
});
