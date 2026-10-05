import { match } from 'ts-pattern';
import type { DiagramBox, DiagramEdge, DiagramNode } from '$lib/ui/components/diagram';
import { SQL_TABLES } from './sql-examples';

type JoinKind = 'inner' | 'left' | 'full' | 'semi' | 'anti';

type PairItemState = 'kept' | 'dropped' | 'consulted';

type PairItem = {
  readonly id: number;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly state: PairItemState;
};

type PairLine = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

type PairsLayout = {
  readonly width: number;
  readonly height: number;
  readonly itemWidth: number;
  readonly itemHeight: number;
  readonly leftTitle: string;
  readonly rightTitle: string;
  readonly left: readonly PairItem[];
  readonly right: readonly PairItem[];
  readonly lines: readonly PairLine[];
};

type SamplePost = {
  readonly id: number;
  readonly userId: number | null;
  readonly title: string;
  readonly published: boolean;
};

type SampleUser = { readonly id: number; readonly name: string };

type VennRegions = {
  readonly leftOnly: readonly string[];
  readonly both: readonly string[];
  readonly rightOnly: readonly string[];
  readonly neither: readonly string[];
};

type VennRegion = keyof VennRegions;

type ProductCell = {
  readonly x: number;
  readonly y: number;
  readonly matched: boolean;
};

type ProductLayout = {
  readonly width: number;
  readonly height: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly columnLabels: readonly { readonly x: number; readonly label: string }[];
  readonly rowLabels: readonly { readonly y: number; readonly label: string }[];
  readonly cells: readonly ProductCell[];
};

type DiagramSpec = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const PAIRS_WIDTH = 360;
const PAIR_ITEM_WIDTH = 130;
const PAIR_ITEM_HEIGHT = 28;
const PAIR_STEP = 36;
const PAIR_TOP = 28;

const PRODUCT_LABEL_WIDTH = 54;
const PRODUCT_CELL_WIDTH = 50;
const PRODUCT_CELL_HEIGHT = 30;
const PRODUCT_HEADER = 24;

const GROUP_WIDTH = 112;
const GROUP_GAP = 12;
const GROUP_TOP = 30;
const GROUP_STEP = 36;
const GROUP_STEP_WITH_DETAIL = 50;
const GROUP_INSET = 6;
const GROUP_BOX_HEIGHT = 30;
const GROUP_BOX_HEIGHT_WITH_DETAIL = 44;
const RESULT_GAP = 30;
const RESULT_HEIGHT = 44;

function sampleUsers(): readonly SampleUser[] {
  return SQL_TABLES.users.rows.map(([id, name]) => ({ id, name }));
}

function samplePosts(): readonly SamplePost[] {
  return SQL_TABLES.posts.rows.map(([id, userId, title, status]) => ({
    id,
    userId,
    title,
    published: status === 'published',
  }));
}

function joinCondition(kind: JoinKind): (post: SamplePost) => boolean {
  return match(kind)
    .with('semi', () => (post: SamplePost) => post.published)
    .with('inner', 'left', 'full', 'anti', () => () => true)
    .exhaustive();
}

function leftState(kind: JoinKind, matched: boolean): PairItemState {
  return match(kind)
    .with('inner', 'semi', () => (matched ? 'kept' : 'dropped'))
    .with('left', 'full', () => 'kept' as const)
    .with('anti', () => (matched ? 'dropped' : 'kept'))
    .exhaustive();
}

function rightState(kind: JoinKind, matched: boolean): PairItemState {
  return match(kind)
    .with('inner', 'left', () => (matched ? 'kept' : 'dropped'))
    .with('full', () => 'kept' as const)
    .with('semi', 'anti', () => (matched ? 'consulted' : 'dropped'))
    .exhaustive();
}

function pairsLayout(kind: JoinKind): PairsLayout {
  const users = sampleUsers();
  const posts = samplePosts();
  const condition = joinCondition(kind);
  const pairs = posts.flatMap((post) =>
    condition(post) && post.userId !== null ? [{ userId: post.userId, postId: post.id }] : [],
  );
  const rightX = PAIRS_WIDTH - PAIR_ITEM_WIDTH;
  const rowY = (index: number): number => PAIR_TOP + index * PAIR_STEP;
  const left = users.map((user, index) => ({
    id: user.id,
    label: user.name,
    x: 0,
    y: rowY(index),
    state: leftState(
      kind,
      pairs.some((pair) => pair.userId === user.id),
    ),
  }));
  const right = posts.map((post, index) => ({
    id: post.id,
    label: `${post.id} ${post.title}`,
    x: rightX,
    y: rowY(index),
    state: rightState(
      kind,
      pairs.some((pair) => pair.postId === post.id),
    ),
  }));
  const lines = pairs.flatMap((pair) => {
    const from = left.find((item) => item.id === pair.userId);
    const to = right.find((item) => item.id === pair.postId);
    if (from === undefined || to === undefined) return [];
    return [
      {
        x1: PAIR_ITEM_WIDTH,
        y1: from.y + PAIR_ITEM_HEIGHT / 2,
        x2: rightX,
        y2: to.y + PAIR_ITEM_HEIGHT / 2,
      },
    ];
  });
  return {
    width: PAIRS_WIDTH,
    height: rowY(Math.max(users.length, posts.length)) - PAIR_STEP + PAIR_ITEM_HEIGHT,
    itemWidth: PAIR_ITEM_WIDTH,
    itemHeight: PAIR_ITEM_HEIGHT,
    leftTitle: 'users',
    rightTitle: 'posts',
    left,
    right,
    lines,
  };
}

function vennRegions(
  left: readonly unknown[],
  right: readonly unknown[],
  universe: readonly SampleUser[],
): VennRegions {
  const inLeft = new Set(left);
  const inRight = new Set(right);
  const names = (keep: (user: SampleUser) => boolean): readonly string[] =>
    universe.filter(keep).map((user) => user.name);
  return {
    leftOnly: names((user) => inLeft.has(user.id) && !inRight.has(user.id)),
    both: names((user) => inLeft.has(user.id) && inRight.has(user.id)),
    rightOnly: names((user) => !inLeft.has(user.id) && inRight.has(user.id)),
    neither: names((user) => !inLeft.has(user.id) && !inRight.has(user.id)),
  };
}

function productLayout(): ProductLayout {
  const users = sampleUsers();
  const posts = samplePosts();
  const cellX = (index: number): number => PRODUCT_LABEL_WIDTH + index * PRODUCT_CELL_WIDTH;
  const cellY = (index: number): number => PRODUCT_HEADER + index * PRODUCT_CELL_HEIGHT;
  return {
    width: cellX(posts.length),
    height: cellY(users.length),
    cellWidth: PRODUCT_CELL_WIDTH,
    cellHeight: PRODUCT_CELL_HEIGHT,
    columnLabels: posts.map((post, index) => ({
      x: cellX(index) + PRODUCT_CELL_WIDTH / 2,
      label: String(post.id),
    })),
    rowLabels: users.map((user, index) => ({
      y: cellY(index) + PRODUCT_CELL_HEIGHT / 2,
      label: user.name,
    })),
    cells: users.flatMap((user, row) =>
      posts.map((post, column) => ({
        x: cellX(column),
        y: cellY(row),
        matched: post.userId === user.id,
      })),
    ),
  };
}

function groupBox(x: number, y: number, label: string, detail?: string): DiagramBox {
  return {
    kind: 'box',
    x,
    y,
    width: GROUP_WIDTH - GROUP_INSET * 2,
    height: detail === undefined ? GROUP_BOX_HEIGHT : GROUP_BOX_HEIGHT_WITH_DETAIL,
    label,
    ...(detail === undefined ? {} : { detail }),
  };
}

type SampleOrder = { readonly id: number; readonly userId: number; readonly total: number };

function sampleOrders(): readonly SampleOrder[] {
  return SQL_TABLES.orders.rows.map(([id, userId, total]) => ({ id, userId, total }));
}

function partitions(): readonly (readonly [SampleUser, readonly SampleOrder[]])[] {
  const orders = sampleOrders();
  return sampleUsers().flatMap((user) => {
    const own = orders.filter((order) => order.userId === user.id);
    return own.length === 0 ? [] : [[user, own] as const];
  });
}

function partitionDiagram(collapse: boolean): DiagramSpec {
  const groups = partitions();
  const deepest = Math.max(...groups.map(([, own]) => own.length));
  const step = collapse ? GROUP_STEP : GROUP_STEP_WITH_DETAIL;
  const groupHeight = GROUP_TOP + deepest * step;
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  groups.forEach(([user, own], index) => {
    const x = index * (GROUP_WIDTH + GROUP_GAP);
    const group: DiagramNode = {
      kind: 'group',
      x,
      y: 0,
      width: GROUP_WIDTH,
      height: groupHeight,
      label: `user_id = ${user.id}`,
      tone: 'primary',
    };
    const sum = own.reduce((total, order) => total + order.total, 0);
    nodes.push(group);
    own.forEach((order, row) => {
      const detail = collapse ? undefined : `user_total ${sum}`;
      nodes.push(
        groupBox(x + GROUP_INSET, GROUP_TOP + row * step, `#${order.id}  ${order.total}`, detail),
      );
    });
    if (collapse) {
      const result: DiagramBox = {
        kind: 'box',
        x: x + GROUP_INSET,
        y: groupHeight + RESULT_GAP,
        width: GROUP_WIDTH - GROUP_INSET * 2,
        height: RESULT_HEIGHT,
        label: `${own.length} orders`,
        detail: `spent ${sum}`,
        tone: 'accent',
      };
      nodes.push(result);
      edges.push({ from: group, to: result });
    }
  });
  const width = groups.length * GROUP_WIDTH + (groups.length - 1) * GROUP_GAP;
  return {
    label: collapse
      ? `The orders split into ${groups.length} groups by user_id; each group becomes one result row with its count and its sum.`
      : `The orders split into the same ${groups.length} partitions, and every order stays a row, with its partition's total beside it.`,
    width,
    height: collapse ? groupHeight + RESULT_GAP + RESULT_HEIGHT : groupHeight,
    nodes,
    edges,
  };
}

function boxAt(y: number, label: string, detail: string): DiagramBox {
  return { kind: 'box', x: 60, y, width: 240, height: 44, label, detail, tone: 'primary' };
}

function clauseOrderDiagram(): DiagramSpec {
  const steps = [
    boxAt(0, 'FROM and JOIN', 'build the input rows'),
    boxAt(64, 'WHERE', 'keep rows where the condition is true'),
    boxAt(128, 'GROUP BY and HAVING', 'partition, aggregate, keep groups'),
    boxAt(192, 'SELECT', 'compute the output columns, windows'),
    boxAt(256, 'DISTINCT', 'remove duplicate output rows'),
    boxAt(320, 'UNION, INTERSECT, EXCEPT', 'combine with another query'),
    boxAt(384, 'ORDER BY and LIMIT', 'sort, then cut'),
  ];
  return {
    label:
      'The logical order of a query: FROM and JOIN, then WHERE, then GROUP BY and HAVING, then SELECT, then DISTINCT, then UNION, INTERSECT or EXCEPT, then ORDER BY and LIMIT.',
    width: 360,
    height: 428,
    nodes: steps,
    edges: steps.slice(1).flatMap((to, index) => {
      const from = steps[index];
      return from === undefined ? [] : [{ from, to }];
    }),
  };
}

const COLUMN_TOP = 30;
const COLUMN_STEP = 36;
const COLUMN_INSET = 6;
const COLUMN_BOX_HEIGHT = 30;

function columnGroup(
  x: number,
  width: number,
  label: string,
  rows: readonly { readonly label: string; readonly kept: boolean }[],
  height: number,
): readonly DiagramNode[] {
  const group: DiagramNode = { kind: 'group', x, y: 0, width, height, label, tone: 'primary' };
  return [
    group,
    ...rows.map((row, index): DiagramNode => ({
      kind: 'box',
      x: x + COLUMN_INSET,
      y: COLUMN_TOP + index * COLUMN_STEP,
      width: width - COLUMN_INSET * 2,
      height: COLUMN_BOX_HEIGHT,
      label: row.label,
      ...(row.kept ? { tone: 'primary' as const } : {}),
    })),
  ];
}

function selectionDiagram(): DiagramSpec {
  const posts = samplePosts();
  const kept = posts.filter((post) => post.published);
  const height = COLUMN_TOP + posts.length * COLUMN_STEP;
  const left = columnGroup(
    0,
    160,
    'posts',
    posts.map((post) => ({
      label: `${post.id} ${post.published ? 'published' : 'draft'}`,
      kept: post.published,
    })),
    height,
  );
  const right = columnGroup(
    200,
    160,
    'σ published',
    kept.map((post) => ({ label: `${post.id} published`, kept: true })),
    height,
  );
  const [from] = left;
  const [to] = right;
  return {
    label: `Selection keeps ${kept.length} of the ${posts.length} posts, the rows whose status is published, with every column.`,
    width: 360,
    height,
    nodes: [...left, ...right],
    edges: from === undefined || to === undefined ? [] : [{ from, to }],
  };
}

function projectionDiagram(): DiagramSpec {
  const kept = samplePosts().filter((post) => post.published);
  const ids = kept.map((post) => post.userId);
  const distinct = [...new Set(ids)];
  const height = COLUMN_TOP + kept.length * COLUMN_STEP;
  const width = 104;
  const gap = 24;
  const columns = [
    columnGroup(
      0,
      width,
      'published',
      kept.map((post) => ({ label: `post ${post.id}`, kept: true })),
      height,
    ),
    columnGroup(
      width + gap,
      width,
      'π user_id',
      ids.map((id) => ({ label: String(id), kept: true })),
      height,
    ),
    columnGroup(
      2 * (width + gap),
      width,
      'DISTINCT',
      distinct.map((id) => ({ label: String(id), kept: true })),
      height,
    ),
  ];
  const groups = columns.flatMap(([group]) => (group === undefined ? [] : [group]));
  return {
    label: `Projection keeps one column of the ${kept.length} published posts, giving ${ids.join(', ')}; DISTINCT then removes the repeat, giving ${distinct.join(', ')}.`,
    width: 3 * width + 2 * gap,
    height,
    nodes: columns.flat(),
    edges: groups.slice(1).flatMap((to, index) => {
      const from = groups[index];
      return from === undefined ? [] : [{ from, to }];
    }),
  };
}

const PARTITION_DIAGRAM = partitionDiagram(true);
const WINDOW_DIAGRAM = partitionDiagram(false);
const CLAUSE_ORDER_DIAGRAM = clauseOrderDiagram();
const SELECTION_DIAGRAM = selectionDiagram();
const PROJECTION_DIAGRAM = projectionDiagram();

export {
  CLAUSE_ORDER_DIAGRAM,
  PARTITION_DIAGRAM,
  PROJECTION_DIAGRAM,
  SELECTION_DIAGRAM,
  WINDOW_DIAGRAM,
  pairsLayout,
  productLayout,
  sampleUsers,
  vennRegions,
};
export type {
  DiagramSpec,
  JoinKind,
  PairItem,
  PairItemState,
  PairLine,
  PairsLayout,
  ProductCell,
  ProductLayout,
  SampleUser,
  VennRegion,
  VennRegions,
};
