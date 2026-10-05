type ToggleLike = Pick<Event, 'target'> & { readonly newState?: unknown };

function entersTopLayer(event: ToggleLike, region: EventTarget): boolean {
  return event.target !== region && event.newState === 'open';
}

export { entersTopLayer };
export type { ToggleLike };
