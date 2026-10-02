import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';

const EDGE_CLICKS_KEY = 'reader.click.edges';

const EDGE_CLICKS_LABEL = 'Click page edges to turn';

function toEdgeClicksTurn(stored: string | null): boolean {
  return stored !== 'off';
}

function readEdgeClicksTurn(locate?: LocateStore): boolean {
  return toEdgeClicksTurn(rememberedString(EDGE_CLICKS_KEY, locate).read());
}

function saveEdgeClicksTurn(wanted: boolean, locate?: LocateStore): void {
  rememberedString(EDGE_CLICKS_KEY, locate).write(wanted ? 'on' : 'off');
}

export {
  EDGE_CLICKS_KEY,
  EDGE_CLICKS_LABEL,
  readEdgeClicksTurn,
  saveEdgeClicksTurn,
  toEdgeClicksTurn,
};
