import { match } from 'ts-pattern';
import type { MarkupVerdict } from '../../../domain/markup-contract';
import { CONTRACT_CASES } from './contract-cases';
import type { ContractCaseId } from './contract-cases';

type ContractCheck = { readonly kind: 'not-run' } | MarkupVerdict;

type FixtureEdit = 'as-written' | 'reformatted' | 'class-dropped' | 'attribute-added';

type FixtureEditOption = {
  readonly edit: FixtureEdit;
  readonly label: string;
};

type CheckSummary = {
  readonly variant: 'info' | 'success' | 'danger';
  readonly title: string;
  readonly text: string;
};

const FIXTURE_EDITS: readonly FixtureEditOption[] = [
  { edit: 'as-written', label: 'As written' },
  { edit: 'reformatted', label: 'First tag reformatted' },
  { edit: 'class-dropped', label: 'Last class dropped' },
  { edit: 'attribute-added', label: 'An attribute added' },
];

const FIRST_TAG = /<([a-z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*>/u;

const TAG_ATTRIBUTE = /[^\s=>/]+(?:="[^"]*")?/gu;

const FIRST_CLASS = /class="([^"]*)"/u;

function reformatted(fixture: string): string {
  return fixture.replace(FIRST_TAG, (_tag, name: string, attributes: string) => {
    const reversed = Array.from(
      attributes.matchAll(TAG_ATTRIBUTE),
      (found) => found[0],
    ).toReversed();
    return [`<${name}`, ...reversed.map((attribute) => `    ${attribute}`)].join('\n') + '\n>';
  });
}

function classDropped(fixture: string): string {
  return fixture.replace(FIRST_CLASS, (_attribute, names: string) => {
    const kept = names
      .split(' ')
      .filter((name) => name !== '')
      .slice(0, -1);
    return `class="${kept.join(' ')}"`;
  });
}

function attributeAdded(fixture: string): string {
  return fixture.replace(FIRST_TAG, (_tag, name: string, attributes: string) => {
    return `<${name}${attributes} data-variant="extra">`;
  });
}

function editedFixture(fixture: string, edit: FixtureEdit): string {
  return match(edit)
    .with('as-written', () => fixture)
    .with('reformatted', () => reformatted(fixture))
    .with('class-dropped', () => classDropped(fixture))
    .with('attribute-added', () => attributeAdded(fixture))
    .exhaustive();
}

function fixtureEdit(value: string): FixtureEdit | undefined {
  return FIXTURE_EDITS.find((option) => option.edit === value)?.edit;
}

function contractCaseId(value: string): ContractCaseId | undefined {
  return CONTRACT_CASES.find((contract) => contract.id === value)?.id;
}

function checkSummary(check: ContractCheck): CheckSummary {
  return match(check)
    .with({ kind: 'not-run' }, () => ({
      variant: 'info' as const,
      title: 'Not checked yet',
      text: 'Run the check to render the component and compare it with the fixture.',
    }))
    .with({ kind: 'match' }, () => ({
      variant: 'success' as const,
      title: 'The component matches the fixture',
      text: 'After normalizing, both sides are the same string.',
    }))
    .with({ kind: 'mismatch' }, (verdict) => ({
      variant: 'danger' as const,
      title: 'The component does not match the fixture',
      text: `The normalized strings first differ at character ${verdict.firstDifference + 1}.`,
    }))
    .exhaustive();
}

export { FIXTURE_EDITS, checkSummary, contractCaseId, editedFixture, fixtureEdit };
export type { CheckSummary, ContractCheck, FixtureEdit, FixtureEditOption };
