import { match } from 'ts-pattern';
import type { SyncNowResult } from '../use-cases/sync-now';

type RunGate = { readonly kind: 'idle' } | { readonly kind: 'running'; readonly runAgain: boolean };

type GateStep = { readonly gate: RunGate; readonly start: boolean };

type RunConditions = { readonly connected: boolean; readonly online: boolean };

type RunOutcome =
  | { readonly kind: 'synced' }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'quiet' };

const CHANGE_DEBOUNCE_MS = 5000;

const IDLE: RunGate = { kind: 'idle' };

function requestRun(gate: RunGate): GateStep {
  if (gate.kind === 'idle') return { gate: { kind: 'running', runAgain: false }, start: true };
  return { gate: { kind: 'running', runAgain: true }, start: false };
}

function finishRun(gate: RunGate): GateStep {
  if (gate.kind === 'running' && gate.runAgain) {
    return { gate: { kind: 'running', runAgain: false }, start: true };
  }
  return { gate: IDLE, start: false };
}

function mayRunNow(conditions: RunConditions): boolean {
  return conditions.connected && conditions.online;
}

function runsOnVisibility(state: DocumentVisibilityState): boolean {
  return state === 'visible';
}

function runOutcome(result: SyncNowResult): RunOutcome {
  return match(result)
    .returnType<RunOutcome>()
    .with({ kind: 'success' }, () => ({ kind: 'synced' }))
    .with({ kind: 'unauthorized' }, () => ({ kind: 'signed-out' }))
    .otherwise(() => ({ kind: 'quiet' }));
}

export { CHANGE_DEBOUNCE_MS, IDLE, finishRun, mayRunNow, requestRun, runOutcome, runsOnVisibility };
export type { GateStep, RunConditions, RunGate, RunOutcome };
