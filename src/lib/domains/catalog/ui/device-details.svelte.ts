import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { DEVICE_TAB } from './library-tabs';

type DetailsNavigation = {
  readonly openDetails: (entryId: string) => void;
  readonly closeDetails: () => void;
  readonly detailsOf: (tab: string) => string | null;
};

type DeviceDetailsHooks = {
  readonly shown: () => BookId | null;
  readonly opened: (id: BookId) => void;
  readonly closed: () => void;
};

type DeviceDetailsLink = {
  readonly hooks: DeviceDetailsHooks;
  readonly connect: (navigation: DetailsNavigation) => void;
};

function createDeviceDetails(): DeviceDetailsLink {
  let navigation = $state.raw<DetailsNavigation | null>(null);

  return {
    hooks: {
      shown: () => {
        const entryId = navigation?.detailsOf(DEVICE_TAB) ?? null;
        return entryId === null ? null : bookId(entryId);
      },
      opened: (id) => navigation?.openDetails(id),
      closed: () => navigation?.closeDetails(),
    },
    connect: (next) => {
      navigation = next;
    },
  };
}

export { createDeviceDetails };
export type { DeviceDetailsHooks, DeviceDetailsLink, DetailsNavigation };
