import type { Emphasis } from './emphasis';

type PacketTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger';

type PacketField = {
  readonly name: string;
  readonly detail?: string;
  readonly span: number;
  readonly tone?: PacketTone;
  readonly emphasis?: Emphasis;
};

type PacketRow = readonly PacketField[];

function isWhole(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function rowProblem(bits: number, row: PacketRow, position: number): string | null {
  const unusable = row.find((field) => !isWhole(field.span));
  if (unusable !== undefined) {
    return `Row ${position + 1} of the packet gives ${unusable.name} a span of ${unusable.span}, which is not a whole number of bits`;
  }
  const total = row.reduce((sum, field) => sum + field.span, 0);
  if (total === bits) return null;
  return `Row ${position + 1} of the packet spans ${total} bits, not the ${bits} bits of a row`;
}

function packetProblems(
  bits: number,
  offsets: readonly number[],
  rows: readonly PacketRow[],
): readonly string[] {
  if (!isWhole(bits)) return [`A packet needs a whole number of bits per row, not ${bits}`];
  const misplaced = offsets
    .filter((offset) => !Number.isInteger(offset) || offset < 0 || offset >= bits)
    .map((offset) => `The ruler offset ${offset} is not a bit of a ${bits}-bit row`);
  const unfilled = rows.flatMap((row, position) => {
    const problem = rowProblem(bits, row, position);
    return problem === null ? [] : [problem];
  });
  return [...misplaced, ...unfilled];
}

export { packetProblems };
export type { PacketField, PacketRow, PacketTone };
