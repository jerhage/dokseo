import { describe, expect, it } from 'vitest';
import { markupVerdict } from '../../../domain/markup-contract';
import { contractCase } from './contract-cases';
import { checkSummary, contractCaseId, editedFixture, fixtureEdit } from './contract-check';

const BADGE = contractCase('badge-success').fixture;

const RENDERED_BADGE = '<span class="badge badge-success"><span>Read</span></span>';

describe('editedFixture', () => {
  it('returns the fixture unchanged as written', () => {
    expect(editedFixture(BADGE, 'as-written')).toBe(BADGE);
  });

  it('writes the first tag with its attributes reversed, one per line, which still matches', () => {
    const edited = editedFixture(contractCase('button-primary').fixture, 'reformatted');

    expect(
      edited.startsWith('<button\n    class="btn btn-primary btn-sm"\n    type="button"\n>'),
    ).toBe(true);
    expect(
      markupVerdict(
        '<button type="button" class="btn btn-primary btn-sm"><span>Save</span></button>',
        edited,
      ).kind,
    ).toBe('match');
  });

  it('drops the last class name of the first class attribute, which no longer matches', () => {
    const edited = editedFixture(BADGE, 'class-dropped');

    expect(edited.startsWith('<span class="badge">')).toBe(true);
    expect(markupVerdict(RENDERED_BADGE, edited).kind).toBe('mismatch');
  });

  it('adds an attribute to the first tag, which no longer matches', () => {
    const edited = editedFixture(BADGE, 'attribute-added');

    expect(edited.startsWith('<span class="badge badge-success" data-variant="extra">')).toBe(true);
    expect(markupVerdict(RENDERED_BADGE, edited).kind).toBe('mismatch');
  });
});

describe('the values a select hands back', () => {
  it('reads a known edit and a known case, and nothing else', () => {
    expect(fixtureEdit('class-dropped')).toBe('class-dropped');
    expect(fixtureEdit('other')).toBeUndefined();
    expect(contractCaseId('accordion')).toBe('accordion');
    expect(contractCaseId('other')).toBeUndefined();
  });
});

describe('checkSummary', () => {
  it('names the first differing character counted from one', () => {
    const summary = checkSummary(markupVerdict('<b>x</b>', '<i>x</i>'));

    expect(summary.variant).toBe('danger');
    expect(summary.text).toContain('character 2');
  });

  it('asks for a run before the first check, and reports a match after one', () => {
    expect(checkSummary({ kind: 'not-run' }).variant).toBe('info');
    expect(checkSummary(markupVerdict(RENDERED_BADGE, BADGE)).variant).toBe('success');
  });
});
