type FieldControl = {
  readonly id: string;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-invalid': 'true' | undefined;
};

type FieldIds = {
  readonly control: string;
  readonly hint: string;
  readonly error: string;
};

function fieldIds(base: string): FieldIds {
  return { control: `${base}-control`, hint: `${base}-hint`, error: `${base}-error` };
}

function fieldControl(ids: FieldIds, hasHint: boolean, hasError: boolean): FieldControl {
  const described = [hasHint ? ids.hint : '', hasError ? ids.error : ''].filter((id) => id !== '');
  return {
    id: ids.control,
    'aria-describedby': described.length === 0 ? undefined : described.join(' '),
    'aria-invalid': hasError ? 'true' : undefined,
  };
}

export { fieldControl, fieldIds };
export type { FieldControl, FieldIds };
