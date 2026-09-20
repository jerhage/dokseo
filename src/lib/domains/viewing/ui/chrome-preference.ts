import { rememberedFlag } from '$lib/platform/storage/remembered-flag';

const CHROME_HIDDEN = false;

const remembered = rememberedFlag('reader.chrome.asked', CHROME_HIDDEN);

export function chromeWanted(): boolean {
  return remembered.value();
}

export function rememberChrome(wanted: boolean): void {
  remembered.set(wanted);
}
