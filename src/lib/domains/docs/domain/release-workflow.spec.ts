import { describe, expect, it } from 'vitest';
import { REPO_EVENTS, deployRuns, workflowRuns } from './release-workflow';
import type { RepoEvent } from './release-workflow';

function kinds(event: RepoEvent): readonly string[] {
  return workflowRuns(event).map((run) => run.outcome.kind);
}

describe('workflowRuns', () => {
  it.each<[RepoEvent, readonly string[]]>([
    ['branch-push', ['not-triggered', 'not-triggered', 'not-triggered']],
    ['pull-request', ['runs', 'not-triggered', 'not-triggered']],
    ['main-push', ['runs', 'runs', 'skipped']],
    ['release-pr-update', ['awaits-approval', 'not-triggered', 'not-triggered']],
    ['release-merge', ['runs', 'runs', 'runs']],
    ['release-published', ['not-triggered', 'not-triggered', 'not-triggered']],
    ['manual-run', ['not-triggered', 'runs', 'runs']],
  ])('reports what each job does for %s', (event, expected) => {
    expect(kinds(event)).toEqual(expected);
  });

  it('offers every event in the picker', () => {
    expect(REPO_EVENTS.map((event) => event.value).toSorted()).toEqual(
      [
        'branch-push',
        'main-push',
        'manual-run',
        'pull-request',
        'release-merge',
        'release-pr-update',
        'release-published',
      ].toSorted(),
    );
  });
});

describe('deployRuns', () => {
  it('runs for a created release or a manual run, and nothing else', () => {
    expect(deployRuns(true, 'push')).toBe(true);
    expect(deployRuns(false, 'workflow_dispatch')).toBe(true);
    expect(deployRuns(false, 'push')).toBe(false);
  });
});
