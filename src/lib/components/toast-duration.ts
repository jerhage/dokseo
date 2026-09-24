import { match } from 'ts-pattern';

type ToastDuration =
  | { readonly kind: 'default' }
  | { readonly kind: 'timed'; readonly ms: number }
  | { readonly kind: 'persistent' };

type RequestedDuration = number | 'persistent' | undefined;

const CSS_TIME = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/iu;

function parseDuration(text: string): number | undefined {
  const found = CSS_TIME.exec(text.trim());
  if (found === null) return undefined;
  const amount = Number(found[1]);
  return found[2]?.toLowerCase() === 's' ? amount * 1000 : amount;
}

function toastDuration(requested: RequestedDuration): ToastDuration {
  if (requested === undefined) return { kind: 'default' };
  if (requested === 'persistent' || !(requested > 0)) return { kind: 'persistent' };
  return { kind: 'timed', ms: requested };
}

function toastTimeout(duration: ToastDuration, cssDefault: string): number | undefined {
  return match(duration)
    .with({ kind: 'default' }, () => {
      const ms = parseDuration(cssDefault);
      return ms !== undefined && ms > 0 ? ms : undefined;
    })
    .with({ kind: 'timed' }, ({ ms }) => ms)
    .with({ kind: 'persistent' }, () => undefined)
    .exhaustive();
}

export { parseDuration, toastDuration, toastTimeout };
export type { RequestedDuration, ToastDuration };
