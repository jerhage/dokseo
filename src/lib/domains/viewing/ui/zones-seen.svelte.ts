import { rememberedString } from '$lib/platform/storage/remembered-string';

const ZONES_SEEN_KEY = 'reader.touch.zones-seen';

const remembered = rememberedString(ZONES_SEEN_KEY);

let seen = $state(remembered.read() !== null);

function zonesSeen(): boolean {
  return seen;
}

function markZonesSeen(): void {
  seen = true;
  remembered.write('seen');
}

function forgetZonesSeen(): void {
  seen = false;
  remembered.forget();
}

export { ZONES_SEEN_KEY, forgetZonesSeen, markZonesSeen, zonesSeen };
