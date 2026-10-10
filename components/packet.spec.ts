import { describe, expect, it } from 'vitest';
import { packetProblems } from './packet';
import type { PacketRow } from './packet';

const HEADER: PacketRow = [
  { name: 'Version', span: 4 },
  { name: 'Header length', span: 4 },
  { name: 'Flags', span: 8 },
  { name: 'Total length', span: 16 },
];

describe('packetProblems', () => {
  it('reports nothing when every row spans exactly the bits of a row', () => {
    expect(packetProblems(32, [0, 8, 16, 24], [HEADER, [{ name: 'Source', span: 32 }]])).toEqual(
      [],
    );
  });

  it('names the row whose spans fall short or run over', () => {
    const short: PacketRow = [{ name: 'Short', span: 31 }];
    const long: PacketRow = [{ name: 'Long', span: 33 }];

    const problems = packetProblems(32, [], [HEADER, short, long]);

    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('Row 2');
    expect(problems[0]).toContain('31 bits');
    expect(problems[1]).toContain('Row 3');
  });

  it('rejects a span that is not a whole number of bits', () => {
    const problems = packetProblems(
      4,
      [],
      [
        [
          { name: 'Half', span: 0.5 },
          { name: 'Rest', span: 3.5 },
        ],
      ],
    );

    expect(problems[0]).toContain('Half');
  });

  it('rejects a ruler offset outside the row', () => {
    const problems = packetProblems(32, [0, 32], [HEADER]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('32');
  });
});
