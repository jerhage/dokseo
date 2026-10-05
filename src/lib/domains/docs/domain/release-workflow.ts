import { match } from 'ts-pattern';

type RepoEvent =
  | 'branch-push'
  | 'pull-request'
  | 'main-push'
  | 'release-pr-update'
  | 'release-merge'
  | 'release-published'
  | 'manual-run';

type WorkflowJob = 'verify' | 'release-please' | 'deploy';

type GitHubEventName = 'push' | 'pull_request' | 'workflow_dispatch' | 'release';

type JobOutcome =
  | { readonly kind: 'runs'; readonly does: string }
  | { readonly kind: 'skipped'; readonly why: string }
  | { readonly kind: 'awaits-approval'; readonly why: string }
  | { readonly kind: 'not-triggered'; readonly why: string };

type JobRun = {
  readonly job: WorkflowJob;
  readonly outcome: JobOutcome;
};

type EventFacts = {
  readonly eventName: GitHubEventName;
  readonly ref: string;
  readonly byWorkflowToken: boolean;
  readonly mergesReleasePullRequest: boolean;
};

const REPO_EVENTS: readonly { readonly value: RepoEvent; readonly label: string }[] = [
  { value: 'branch-push', label: 'Push to a feature branch' },
  { value: 'pull-request', label: 'Open or update a pull request' },
  { value: 'main-push', label: 'Merge a feature pull request' },
  { value: 'release-pr-update', label: 'release-please updates its pull request' },
  { value: 'release-merge', label: 'Merge the release pull request' },
  { value: 'release-published', label: 'release-please publishes the release' },
  { value: 'manual-run', label: 'Run Release by hand' },
];

const JOB_CONDITIONS: Readonly<Record<WorkflowJob, string>> = {
  verify: 'ci.yml, on: pull_request, or push to main',
  'release-please': 'release.yml, on: push to main, or workflow_dispatch',
  deploy:
    "needs: release-please, if: release_created == 'true' || event_name == 'workflow_dispatch'",
};

function eventFacts(event: RepoEvent): EventFacts {
  return match<RepoEvent, EventFacts>(event)
    .with('branch-push', () => ({
      eventName: 'push',
      ref: 'refs/heads/feat/12-export',
      byWorkflowToken: false,
      mergesReleasePullRequest: false,
    }))
    .with('pull-request', () => ({
      eventName: 'pull_request',
      ref: 'refs/pull/12/merge',
      byWorkflowToken: false,
      mergesReleasePullRequest: false,
    }))
    .with('main-push', () => ({
      eventName: 'push',
      ref: 'refs/heads/main',
      byWorkflowToken: false,
      mergesReleasePullRequest: false,
    }))
    .with('release-pr-update', () => ({
      eventName: 'pull_request',
      ref: 'refs/pull/13/merge',
      byWorkflowToken: true,
      mergesReleasePullRequest: false,
    }))
    .with('release-merge', () => ({
      eventName: 'push',
      ref: 'refs/heads/main',
      byWorkflowToken: false,
      mergesReleasePullRequest: true,
    }))
    .with('release-published', () => ({
      eventName: 'release',
      ref: 'refs/tags/v0.9.5',
      byWorkflowToken: true,
      mergesReleasePullRequest: false,
    }))
    .with('manual-run', () => ({
      eventName: 'workflow_dispatch',
      ref: 'refs/heads/main',
      byWorkflowToken: false,
      mergesReleasePullRequest: false,
    }))
    .exhaustive();
}

const MAIN = 'refs/heads/main';

function deployRuns(releaseCreated: boolean, eventName: GitHubEventName): boolean {
  return releaseCreated || eventName === 'workflow_dispatch';
}

function verifyOutcome(facts: EventFacts): JobOutcome {
  const listened =
    facts.eventName === 'pull_request' || (facts.eventName === 'push' && facts.ref === MAIN);
  if (!listened)
    return {
      kind: 'not-triggered',
      why: 'CI runs only on pull requests and pushes to main.',
    };
  if (facts.byWorkflowToken)
    return {
      kind: 'awaits-approval',
      why: 'A pull request event caused by GITHUB_TOKEN creates a run that waits for approval.',
    };
  return { kind: 'runs', does: 'npm run verify:ci: static checks, unit tests, build.' };
}

function releasePleaseOutcome(facts: EventFacts): JobOutcome {
  const listened =
    facts.eventName === 'workflow_dispatch' || (facts.eventName === 'push' && facts.ref === MAIN);
  if (!listened)
    return {
      kind: 'not-triggered',
      why:
        facts.byWorkflowToken && facts.eventName === 'release'
          ? 'No workflow runs on a release event, and an event made with GITHUB_TOKEN starts no workflow anyway.'
          : 'Release runs only on pushes to main and manual runs.',
    };
  if (facts.mergesReleasePullRequest)
    return {
      kind: 'runs',
      does: 'Finds the merged release pull request, tags the commit and creates the GitHub Release. release_created is true.',
    };
  return {
    kind: 'runs',
    does: 'Opens or updates the release pull request if anything since the last release belongs in the changelog. release_created is false.',
  };
}

function deployOutcome(facts: EventFacts, releasePlease: JobOutcome): JobOutcome {
  if (releasePlease.kind !== 'runs')
    return { kind: 'not-triggered', why: 'The Release workflow did not run.' };
  if (!deployRuns(facts.mergesReleasePullRequest, facts.eventName))
    return {
      kind: 'skipped',
      why: 'release_created is false and the event is not workflow_dispatch, so the if is false.',
    };
  if (facts.eventName === 'workflow_dispatch')
    return {
      kind: 'runs',
      does: 'Looks up the latest release with gh release view, checks out its tag, builds and deploys it.',
    };
  return {
    kind: 'runs',
    does: 'Checks out the new tag, builds it and runs wrangler deploy.',
  };
}

function workflowRuns(event: RepoEvent): readonly JobRun[] {
  const facts = eventFacts(event);
  const releasePlease = releasePleaseOutcome(facts);
  return [
    { job: 'verify', outcome: verifyOutcome(facts) },
    { job: 'release-please', outcome: releasePlease },
    { job: 'deploy', outcome: deployOutcome(facts, releasePlease) },
  ];
}

export { JOB_CONDITIONS, REPO_EVENTS, deployRuns, eventFacts, workflowRuns };
export type { EventFacts, GitHubEventName, JobOutcome, JobRun, RepoEvent, WorkflowJob };
