type ShellMessage = { readonly kind: 'skip-waiting' };

const SKIP_WAITING: ShellMessage = { kind: 'skip-waiting' };

function isSkipWaiting(data: unknown): boolean {
  return (
    typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'skip-waiting'
  );
}

export { SKIP_WAITING, isSkipWaiting };
export type { ShellMessage };
