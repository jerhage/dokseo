import {
  IMAGE_ARRIVAL_SHOWING,
  imageArrivalShows,
  mirroredPlace,
} from '$lib/shared/reader-location';
import type { ImageArrivalStanding, ShownPlace } from '$lib/shared/reader-location';

function createImageArrival(shown: () => URL, replace: (url: URL) => void) {
  let standing = $state.raw<ImageArrivalStanding>(IMAGE_ARRIVAL_SHOWING);

  return {
    get shows(): boolean {
      return imageArrivalShows(standing);
    },
    mirror(place: ShownPlace): void {
      const mirrored = mirroredPlace(shown(), place, standing);
      standing = mirrored.standing;
      if (mirrored.url !== null) replace(mirrored.url);
    },
    reset(): void {
      standing = IMAGE_ARRIVAL_SHOWING;
    },
  };
}

type ImageArrivalHook = ReturnType<typeof createImageArrival>;

export { createImageArrival };
export type { ImageArrivalHook };
