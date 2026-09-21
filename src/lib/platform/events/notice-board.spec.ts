import { describe, expect, it } from 'vitest';
import { noticeBoard } from './notice-board';

describe('noticeBoard', () => {
  it('reaches every watcher of the key a value was posted to', () => {
    const board = noticeBoard<string, number>();
    const first: number[] = [];
    const second: number[] = [];

    board.watch('a', (value) => first.push(value));
    board.watch('a', (value) => second.push(value));
    board.post('a', 1);

    expect(first).toEqual([1]);
    expect(second).toEqual([1]);
  });

  it('leaves the watchers of another key untouched', () => {
    const board = noticeBoard<string, number>();
    const other: number[] = [];

    board.watch('b', (value) => other.push(value));
    board.post('a', 1);

    expect(other).toEqual([]);
  });

  it('keeps the remembered value of two keys apart', () => {
    const board = noticeBoard<string, number>();

    board.post('a', 1);
    board.post('b', 2);

    expect(board.latest('a')).toBe(1);
    expect(board.latest('b')).toBe(2);
  });

  it('posts nothing to a key with no watcher', () => {
    const board = noticeBoard<string, number>();

    expect(() => board.post('a', 1)).not.toThrow();
    expect(board.latest('a')).toBe(1);
  });

  it('removes one watcher and leaves the rest', () => {
    const board = noticeBoard<string, number>();
    const dropped: number[] = [];
    const kept: number[] = [];
    const notice = (value: number) => dropped.push(value);

    board.watch('a', notice);
    board.watch('a', (value) => kept.push(value));
    board.stop('a', notice);
    board.post('a', 1);

    expect(dropped).toEqual([]);
    expect(kept).toEqual([1]);
  });

  it('ignores a watcher it never held', () => {
    const board = noticeBoard<string, number>();
    const seen: number[] = [];

    board.stop('a', (value) => seen.push(value));
    board.watch('a', (value) => seen.push(value));
    board.post('a', 1);

    expect(seen).toEqual([1]);
  });

  it('answers the most recent post', () => {
    const board = noticeBoard<string, number>();

    board.post('a', 1);
    board.post('a', 2);

    expect(board.latest('a')).toBe(2);
  });

  it('answers undefined before anything is posted', () => {
    const board = noticeBoard<string, number>();

    expect(board.latest('a')).toBeUndefined();
  });

  it('drops the remembered value of one key only', () => {
    const board = noticeBoard<string, number>();

    board.post('a', 1);
    board.post('b', 2);
    board.forget('a');

    expect(board.latest('a')).toBeUndefined();
    expect(board.latest('b')).toBe(2);
  });

  it('keeps watching a key whose remembered value it dropped', () => {
    const board = noticeBoard<string, number>();
    const seen: number[] = [];

    board.watch('a', (value) => seen.push(value));
    board.post('a', 1);
    board.forget('a');
    board.post('a', 2);

    expect(seen).toEqual([1, 2]);
  });
});
