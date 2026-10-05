import type { ClassList } from './classes';

type ListGroupVariant = 'separated' | 'inset';

type ListRowLayout = 'value' | 'actions';

type ListRowSize = 'sm' | 'md';

type ListRowValueTone = 'default' | 'faint';

const LIST_GROUP_VARIANTS: Readonly<Record<ListGroupVariant, ClassList>> = {
  separated: ['list-group-separated'],
  inset: ['list-group-inset'],
};

const LIST_ROW_LAYOUTS: Readonly<Record<ListRowLayout, ClassList>> = {
  value: ['list-row-main-value'],
  actions: ['list-row-main-actions'],
};

const LIST_ROW_SIZES: Readonly<Record<ListRowSize, ClassList>> = {
  sm: ['list-row-sm'],
  md: [],
};

const LIST_ROW_VALUE_TONES: Readonly<Record<ListRowValueTone, ClassList>> = {
  default: [],
  faint: ['list-row-value-faint'],
};

function listRowLayout(actions: unknown): ListRowLayout {
  return actions === undefined ? 'value' : 'actions';
}

export {
  LIST_GROUP_VARIANTS,
  LIST_ROW_LAYOUTS,
  LIST_ROW_SIZES,
  LIST_ROW_VALUE_TONES,
  listRowLayout,
};
export type { ListGroupVariant, ListRowLayout, ListRowSize, ListRowValueTone };
