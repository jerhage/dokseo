type KeyPress = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
};

type WriterKey = 'save' | 'abandon' | 'type';

type PickerKey = 'down' | 'up' | 'choose' | 'close' | 'type';

function writerKey(press: KeyPress): WriterKey {
  if (press.key === 'Escape') return 'abandon';
  if (press.key === 'Enter' && (press.metaKey || press.ctrlKey)) return 'save';

  return 'type';
}

function pickerKey(press: KeyPress): PickerKey {
  if (press.key === 'ArrowDown') return 'down';
  if (press.key === 'ArrowUp') return 'up';
  if (press.key === 'Enter') return 'choose';
  if (press.key === 'Escape') return 'close';

  return 'type';
}

export { pickerKey, writerKey };
export type { KeyPress, PickerKey, WriterKey };
