import { describe, expect, it } from 'vitest';
import {
  CLAUSE_ORDER_DIAGRAM,
  PARTITION_DIAGRAM,
  PROJECTION_DIAGRAM,
  SELECTION_DIAGRAM,
  WINDOW_DIAGRAM,
  pairsLayout,
  productLayout,
  sampleUsers,
  vennRegions,
} from './sql-diagrams';
import type { JoinKind, PairItem } from './sql-diagrams';
import { SQL_EXAMPLES } from './sql-examples';

function labels(items: readonly PairItem[], state: PairItem['state']): readonly string[] {
  return items.filter((item) => item.state === state).map((item) => item.label);
}

function namesIn(rows: readonly (readonly unknown[])[]): readonly unknown[] {
  return rows.map((row) => row[0]);
}

describe('pairsLayout', () => {
  it('keeps the users and posts the inner join returns', () => {
    const layout = pairsLayout('inner');

    expect(labels(layout.left, 'kept')).toEqual([...new Set(namesIn(SQL_EXAMPLES.innerJoin.rows))]);
    expect(labels(layout.right, 'kept').map((label) => Number.parseInt(label, 10))).toEqual(
      SQL_EXAMPLES.innerJoin.rows.map((row) => row[1]),
    );
    expect(layout.lines).toHaveLength(SQL_EXAMPLES.innerJoin.rows.length);
  });

  it('keeps every user in the left join and every row in the full join', () => {
    expect(labels(pairsLayout('left').left, 'dropped')).toEqual([]);
    expect(labels(pairsLayout('left').right, 'dropped')).toEqual(['106 Guest post']);
    expect(labels(pairsLayout('full').right, 'dropped')).toEqual([]);
  });

  it('keeps the users the semi-join and anti-join queries return', () => {
    expect(labels(pairsLayout('semi').left, 'kept')).toEqual(
      SQL_EXAMPLES.semiJoinExists.rows.map((row) => row[1]),
    );
    expect(labels(pairsLayout('anti').left, 'kept')).toEqual(
      SQL_EXAMPLES.antiJoinNotExists.rows.map((row) => row[1]),
    );
  });

  it('draws a line only to published posts for the semi-join', () => {
    expect(pairsLayout('semi').lines).toHaveLength(SQL_EXAMPLES.joinRepeats.rows.length);
    expect(labels(pairsLayout('semi').right, 'consulted')).toEqual([
      '101 Hello',
      '103 Sets',
      '104 Joins',
    ]);
  });

  it.each<JoinKind>(['inner', 'left', 'full', 'semi', 'anti'])(
    'fits every %s item inside the width and height',
    (kind) => {
      const layout = pairsLayout(kind);

      for (const item of [...layout.left, ...layout.right]) {
        expect(item.x + layout.itemWidth).toBeLessThanOrEqual(layout.width);
        expect(item.y + layout.itemHeight).toBeLessThanOrEqual(layout.height);
      }
      expect(layout.width).toBeLessThanOrEqual(360);
    },
  );
});

describe('vennRegions', () => {
  it('places each user in the region the set queries agree on', () => {
    const regions = vennRegions(
      SQL_EXAMPLES.authors.rows.map((row) => row[0]),
      SQL_EXAMPLES.buyers.rows.map((row) => row[0]),
      sampleUsers(),
    );

    expect(regions).toEqual({
      leftOnly: ['Bob'],
      both: ['Alice'],
      rightOnly: ['Chen'],
      neither: ['Dana'],
    });
  });
});

describe('productLayout', () => {
  it('draws one cell per pair and marks the inner join matches', () => {
    const layout = productLayout();

    expect(layout.cells).toHaveLength(Number(SQL_EXAMPLES.productSize.rows[0]?.[0]));
    expect(layout.cells.filter((cell) => cell.matched)).toHaveLength(
      SQL_EXAMPLES.innerJoin.rows.length,
    );
    expect(layout.width).toBeLessThanOrEqual(360);
  });
});

describe('the partition diagrams', () => {
  it('draws one group per user with orders and one result per group', () => {
    const groups = PARTITION_DIAGRAM.nodes.filter((node) => node.kind === 'group');

    expect(groups).toHaveLength(SQL_EXAMPLES.groupBy.rows.length);
    expect(PARTITION_DIAGRAM.edges).toHaveLength(SQL_EXAMPLES.groupBy.rows.length);
    expect(PARTITION_DIAGRAM.width).toBeLessThanOrEqual(360);
  });

  it('keeps every order as a box in the window diagram, with its total beside it', () => {
    const boxes = WINDOW_DIAGRAM.nodes.filter((node) => node.kind === 'box');

    expect(boxes).toHaveLength(SQL_EXAMPLES.window.rows.length);
    expect(boxes.map((box) => ('detail' in box ? box.detail : ''))).toEqual(
      SQL_EXAMPLES.window.rows.map((row) => `user_total ${row[3]}`),
    );
  });

  it('chains the clause order from FROM to LIMIT', () => {
    expect(CLAUSE_ORDER_DIAGRAM.edges).toHaveLength(CLAUSE_ORDER_DIAGRAM.nodes.length - 1);
  });

  it('keeps in the selection diagram the posts the selection query returns', () => {
    const kept = SELECTION_DIAGRAM.nodes.filter(
      (node) => node.kind === 'box' && node.tone === 'primary' && node.x >= 200,
    );

    expect(kept.map((node) => Number.parseInt(node.label, 10))).toEqual(
      SQL_EXAMPLES.selection.rows.map((row) => row[0]),
    );
  });

  it('ends the projection diagram with the ids the DISTINCT query returns', () => {
    const last = PROJECTION_DIAGRAM.nodes.filter((node) => node.kind === 'box' && node.x >= 256);

    expect(last.map((node) => Number(node.label))).toEqual(
      SQL_EXAMPLES.distinct.rows.map((row) => row[0]),
    );
    expect(PROJECTION_DIAGRAM.width).toBeLessThanOrEqual(360);
  });
});
