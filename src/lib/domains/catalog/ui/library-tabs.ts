import type { TabItem } from '$lib/ui/components/tabs';
import type { Catalog } from '../domain/catalog';

const DEVICE_TAB = 'device';

const DEVICE_TAB_LABEL = 'On this device';

const TABS_LABEL = 'Library source';

function catalogTabs(catalogs: readonly Catalog[]): readonly TabItem[] {
  return [
    { id: DEVICE_TAB, label: DEVICE_TAB_LABEL },
    ...catalogs.map((catalog) => ({ id: catalog.id, label: catalog.title })),
  ];
}

export { DEVICE_TAB, DEVICE_TAB_LABEL, TABS_LABEL, catalogTabs };
