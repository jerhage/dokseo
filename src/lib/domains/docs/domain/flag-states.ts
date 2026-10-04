import { match } from 'ts-pattern';

type LoadFlag = 'loading' | 'failed' | 'ready';

type LoadDetail = 'titles' | 'message';

type LoadField = LoadFlag | LoadDetail;

type LoadVariant = LoadFlag;

type FlagCell = { readonly field: LoadField; readonly set: boolean };

type FlagVerdict =
  | { readonly kind: 'variant'; readonly variant: LoadVariant }
  | { readonly kind: 'meaningless'; readonly reasons: readonly string[] };

type FlagRow = {
  readonly cells: readonly FlagCell[];
  readonly verdict: FlagVerdict;
};

type FlagTally = {
  readonly combinations: number;
  readonly meaningful: number;
};

const LOAD_FLAGS: readonly LoadFlag[] = ['loading', 'failed', 'ready'];

const LOAD_DETAILS: readonly LoadDetail[] = ['titles', 'message'];

function detailOwner(detail: LoadDetail): LoadFlag {
  return match(detail)
    .with('titles', (): LoadFlag => 'ready')
    .with('message', (): LoadFlag => 'failed')
    .exhaustive();
}

function fieldsWith(details: readonly LoadDetail[]): readonly LoadField[] {
  return [...LOAD_FLAGS, ...LOAD_DETAILS.filter((detail) => details.includes(detail))];
}

function isSet(cells: readonly FlagCell[], field: LoadField): boolean {
  return cells.some((cell) => cell.field === field && cell.set);
}

function flagReasons(cells: readonly FlagCell[]): readonly string[] {
  const raised = LOAD_FLAGS.filter((flag) => isSet(cells, flag));
  if (raised.length === 0) return ['no flag is true'];
  if (raised.length === 1) return [];
  const last = raised.at(-1);
  const others = raised.slice(0, -1).join(', ');
  const all = raised.length === LOAD_FLAGS.length ? 'all' : 'both';
  return [`${others} and ${last} are ${all} true`];
}

function detailReasons(cells: readonly FlagCell[], detail: LoadDetail): readonly string[] {
  if (!cells.some((cell) => cell.field === detail)) return [];
  const owner = detailOwner(detail);
  const held = isSet(cells, detail);
  const owned = isSet(cells, owner);
  if (held && !owned) return [`${detail} without ${owner}`];
  if (!held && owned) return [`${owner} without ${detail}`];
  return [];
}

function flagVerdict(cells: readonly FlagCell[]): FlagVerdict {
  const reasons = [
    ...flagReasons(cells),
    ...LOAD_DETAILS.flatMap((detail) => detailReasons(cells, detail)),
  ];
  const variant = LOAD_FLAGS.find((flag) => isSet(cells, flag));
  if (reasons.length > 0 || variant === undefined) return { kind: 'meaningless', reasons };
  return { kind: 'variant', variant };
}

function flagRows(details: readonly LoadDetail[]): readonly FlagRow[] {
  const fields = fieldsWith(details);
  const count = 2 ** fields.length;
  return Array.from({ length: count }, (_, combination) => {
    const cells = fields.map((field, position) => ({
      field,
      set: (combination >> (fields.length - 1 - position)) % 2 === 1,
    }));
    return { cells, verdict: flagVerdict(cells) };
  });
}

function detailDeclaration(detail: LoadDetail): string {
  return match(detail)
    .with('titles', () => '  readonly titles?: readonly string[];')
    .with('message', () => '  readonly message?: string;')
    .exhaustive();
}

function flatLoadType(details: readonly LoadDetail[]): string {
  return [
    'type Load = {',
    ...LOAD_FLAGS.map((flag) => `  readonly ${flag}: boolean;`),
    ...LOAD_DETAILS.filter((detail) => details.includes(detail)).map(detailDeclaration),
    '};',
  ].join('\n');
}

function flagCellText(cell: FlagCell): string {
  const detail = LOAD_DETAILS.some((name) => name === cell.field);
  if (detail) return cell.set ? 'set' : 'absent';
  return cell.set ? 'true' : 'false';
}

function flagTally(rows: readonly FlagRow[]): FlagTally {
  return {
    combinations: rows.length,
    meaningful: rows.filter((row) => row.verdict.kind === 'variant').length,
  };
}

export {
  LOAD_DETAILS,
  LOAD_FLAGS,
  fieldsWith,
  flagCellText,
  flagRows,
  flagTally,
  flagVerdict,
  flatLoadType,
};
export type {
  FlagCell,
  FlagRow,
  FlagTally,
  FlagVerdict,
  LoadDetail,
  LoadField,
  LoadFlag,
  LoadVariant,
};
