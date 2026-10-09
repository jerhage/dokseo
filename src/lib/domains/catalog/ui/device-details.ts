import type { BookId } from '$lib/shared/ids';

type DetailsNavigation = {
  readonly openDetails: (entryId: string) => void;
  readonly closeDetails: () => void;
};

type DeviceDetailsHooks = {
  readonly opened: (id: BookId) => void;
  readonly closed: () => void;
};

type DeviceDetailsLink = {
  readonly hooks: DeviceDetailsHooks;
  readonly connect: (navigation: DetailsNavigation) => void;
};

function createDeviceDetails(): DeviceDetailsLink {
  let navigation: DetailsNavigation | null = null;

  return {
    hooks: {
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
