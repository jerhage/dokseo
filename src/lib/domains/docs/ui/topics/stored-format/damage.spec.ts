import { describe, expect, it } from 'vitest';
import {
  FIXTURES,
  damageSummary,
  damagedRow,
  fieldsOf,
  fixtureById,
  readDamaged,
  shownValue,
  valueAt,
} from './damage';

describe('damaging a stored fixture', () => {
  it('reads every undamaged fixture as unchanged', () => {
    const reads = FIXTURES.map((fixture) => readDamaged(fixture, fixture.row));

    expect(reads.every((read) => read.kind === 'read' && read.unchanged)).toBe(true);
  });

  it('changes only the chosen field of a copy, inside a list of regions too', () => {
    const fixture = fixtureById('capture:recognized, scored');
    const row = damagedRow(fixture.row, 'anchor.regions[].rect.x', 'not-finite');

    expect(valueAt(row, 'anchor.regions[].rect.x')).toBeNaN();
    expect(valueAt(fixture.row, 'anchor.regions[].rect.x')).toBe(0.104167);
    expect(valueAt(row, 'text')).toBe(fixture.row.text);
  });

  it('removes a field so that the value reads as absent', () => {
    const fixture = fixtureById('book:paged');
    const row = damagedRow(fixture.row, 'direction', 'remove');

    expect(shownValue(valueAt(row, 'direction'))).toBe('absent');
    expect(readDamaged(fixture, row)).toEqual({
      kind: 'unreadable',
      reason: 'A stored book lacks its direction',
      apart: true,
    });
  });

  it('reports the real mapper reason for a value its check refuses', () => {
    const fixture = fixtureById('book:continuous');
    const row = damagedRow(fixture.row, 'position.offset', 'over-one');

    expect(readDamaged(fixture, row)).toEqual({
      kind: 'unreadable',
      reason: 'A stored book holds an unknown position offset: 1.5',
      apart: true,
    });
  });

  it('reads a value the check accepts, and says the record holds it', () => {
    const fixture = fixtureById('book:paged');
    const read = readDamaged(fixture, damagedRow(fixture.row, 'alias', 'empty-text'));

    expect(read).toEqual({ kind: 'read', unchanged: false });
    expect(damageSummary(fixture, read).title).toBe('Read, with the new value');
  });

  it('reports an unreadable page list through its own union', () => {
    const fixture = fixtureById('page-list:archive');
    const read = readDamaged(fixture, damagedRow(fixture.row, 'names', 'null'));

    expect(read).toEqual({
      kind: 'unreadable',
      reason: 'A stored page list holds an unknown page names: null',
      apart: true,
    });
  });

  it('refuses a note on a written capture as a field its origin does not have', () => {
    const fixture = fixtureById('capture:written');
    const read = readDamaged(fixture, { ...fixture.row, note: null });

    expect(read).toEqual({
      kind: 'unreadable',
      reason: 'A stored capture holds an unknown note for a written capture: null',
      apart: true,
    });
  });

  it('says a book, capture or tag with no usable id fails its whole list', () => {
    for (const id of ['book:paged', 'capture:written', 'tag:vocabulary']) {
      const fixture = fixtureById(id);
      const read = readDamaged(fixture, damagedRow(fixture.row, 'id', 'empty-text'));

      expect(read.kind === 'unreadable' && read.apart).toBe(false);
      expect(damageSummary(fixture, read).title).toBe('Unreadable, with no usable id');
    }
  });

  it('lists a removed record with a bad field apart, and leaves one out with no usable id', () => {
    const fixture = fixtureById('removed-book:removed paged');

    const badTime = readDamaged(fixture, damagedRow(fixture.row, 'removedAt', 'text'));
    const noId = readDamaged(fixture, damagedRow(fixture.row, 'id', 'remove'));

    expect(badTime).toMatchObject({ kind: 'unreadable', apart: true });
    expect(noId).toMatchObject({ kind: 'unreadable', apart: false });
    expect(damageSummary(fixture, noId).text).toContain('Removed books leaves out');
  });

  it('offers every field of the fixture once, in the fixture order', () => {
    expect(fieldsOf(fixtureById('tag:grammar'))).toEqual(['id', 'name', 'colour', 'createdAt']);
    expect(fieldsOf(fixtureById('capture:recognized, scored'))).toContain(
      'anchor.regions[].rect.height',
    );
  });

  it('makes every fixture unreadable when any one of its fields is removed', () => {
    const reads = FIXTURES.flatMap((fixture) =>
      fieldsOf(fixture).map((field) =>
        readDamaged(fixture, damagedRow(fixture.row, field, 'remove')),
      ),
    );

    expect(reads.filter((read) => read.kind === 'read')).toEqual([]);
  });

  it('shows NaN by name, where JSON would print null', () => {
    expect(shownValue(Number.NaN)).toBe('NaN');
    expect(shownValue('x')).toBe('"x"');
  });
});
