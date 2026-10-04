type SqlValue = string | number | null;

type SqlRow = readonly SqlValue[];

type SqlEngine = 'sqlite' | 'postgres';

type SqlTable = {
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly SqlRow[];
};

type SqlExample = {
  readonly sql: string;
  readonly engine: SqlEngine;
  readonly columns: readonly string[];
  readonly rows: readonly SqlRow[];
};

const SQL_SCHEMA = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users (id),
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  total INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at DATE NOT NULL
);`;

const SQL_TABLES = {
  users: {
    name: 'users',
    columns: ['id', 'name'],
    rows: [
      [1, 'Alice'],
      [2, 'Bob'],
      [3, 'Chen'],
      [4, 'Dana'],
    ],
  },
  posts: {
    name: 'posts',
    columns: ['id', 'user_id', 'title', 'status', 'created_at'],
    rows: [
      [101, 1, 'Hello', 'published', '2026-09-01'],
      [102, 1, 'Draft notes', 'draft', '2026-09-05'],
      [103, 1, 'Sets', 'published', '2026-09-20'],
      [104, 2, 'Joins', 'published', '2026-09-18'],
      [105, 3, 'Untitled', 'draft', '2026-09-10'],
      [106, null, 'Guest post', 'draft', '2026-09-12'],
    ],
  },
  orders: {
    name: 'orders',
    columns: ['id', 'user_id', 'total', 'status', 'created_at'],
    rows: [
      [1, 1, 30, 'completed', '2026-09-01'],
      [2, 1, 45, 'canceled', '2026-09-03'],
      [3, 1, 20, 'completed', '2026-09-10'],
      [4, 2, 60, 'pending', '2026-09-02'],
      [5, 2, 15, 'canceled', '2026-09-12'],
      [6, 3, 25, 'completed', '2026-09-05'],
      [7, 3, 25, 'completed', '2026-09-10'],
      [8, 3, 40, 'canceled', '2026-09-14'],
    ],
  },
} as const satisfies Readonly<Record<string, SqlTable>>;

const SQL_EXAMPLES = {
  nullComparisons: {
    engine: 'sqlite',
    sql: `SELECT
  NULL = NULL AS equal,
  NULL <> 1 AS not_one,
  NULL IS NULL AS is_null;`,
    columns: ['equal', 'not_one', 'is_null'],
    rows: [[null, null, 1]],
  },
  notOne: {
    engine: 'sqlite',
    sql: `SELECT id, user_id, title
FROM posts
WHERE user_id <> 1
ORDER BY id;`,
    columns: ['id', 'user_id', 'title'],
    rows: [
      [104, 2, 'Joins'],
      [105, 3, 'Untitled'],
    ],
  },
  notOneOrNull: {
    engine: 'sqlite',
    sql: `SELECT id, user_id, title
FROM posts
WHERE user_id IS DISTINCT FROM 1
ORDER BY id;`,
    columns: ['id', 'user_id', 'title'],
    rows: [
      [104, 2, 'Joins'],
      [105, 3, 'Untitled'],
      [106, null, 'Guest post'],
    ],
  },
  nullsSorted: {
    engine: 'sqlite',
    sql: `SELECT id, user_id
FROM posts
ORDER BY user_id, id;`,
    columns: ['id', 'user_id'],
    rows: [
      [106, null],
      [101, 1],
      [102, 1],
      [103, 1],
      [104, 2],
      [105, 3],
    ],
  },
  selection: {
    engine: 'sqlite',
    sql: `SELECT *
FROM posts
WHERE status = 'published'
ORDER BY id;`,
    columns: ['id', 'user_id', 'title', 'status', 'created_at'],
    rows: [
      [101, 1, 'Hello', 'published', '2026-09-01'],
      [103, 1, 'Sets', 'published', '2026-09-20'],
      [104, 2, 'Joins', 'published', '2026-09-18'],
    ],
  },
  projection: {
    engine: 'sqlite',
    sql: `SELECT user_id
FROM posts
WHERE status = 'published'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1], [1], [2]],
  },
  distinct: {
    engine: 'sqlite',
    sql: `SELECT DISTINCT user_id
FROM posts
WHERE status = 'published'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1], [2]],
  },
  productSize: {
    engine: 'sqlite',
    sql: `SELECT COUNT(*) AS pairs
FROM users
CROSS JOIN posts;`,
    columns: ['pairs'],
    rows: [[24]],
  },
  innerJoin: {
    engine: 'sqlite',
    sql: `SELECT u.name, p.id AS post_id, p.title
FROM users u
JOIN posts p ON p.user_id = u.id
ORDER BY p.id;`,
    columns: ['name', 'post_id', 'title'],
    rows: [
      ['Alice', 101, 'Hello'],
      ['Alice', 102, 'Draft notes'],
      ['Alice', 103, 'Sets'],
      ['Bob', 104, 'Joins'],
      ['Chen', 105, 'Untitled'],
    ],
  },
  filteredProduct: {
    engine: 'sqlite',
    sql: `SELECT u.name, p.id AS post_id, p.title
FROM users u
CROSS JOIN posts p
WHERE p.user_id = u.id
ORDER BY p.id;`,
    columns: ['name', 'post_id', 'title'],
    rows: [
      ['Alice', 101, 'Hello'],
      ['Alice', 102, 'Draft notes'],
      ['Alice', 103, 'Sets'],
      ['Bob', 104, 'Joins'],
      ['Chen', 105, 'Untitled'],
    ],
  },
  leftJoin: {
    engine: 'sqlite',
    sql: `SELECT u.name, p.id AS post_id, p.title
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
ORDER BY u.id, p.id;`,
    columns: ['name', 'post_id', 'title'],
    rows: [
      ['Alice', 101, 'Hello'],
      ['Alice', 102, 'Draft notes'],
      ['Alice', 103, 'Sets'],
      ['Bob', 104, 'Joins'],
      ['Chen', 105, 'Untitled'],
      ['Dana', null, null],
    ],
  },
  fullJoin: {
    engine: 'sqlite',
    sql: `SELECT u.name, p.id AS post_id, p.title
FROM users u
FULL JOIN posts p ON p.user_id = u.id
ORDER BY u.id, p.id;`,
    columns: ['name', 'post_id', 'title'],
    rows: [
      [null, 106, 'Guest post'],
      ['Alice', 101, 'Hello'],
      ['Alice', 102, 'Draft notes'],
      ['Alice', 103, 'Sets'],
      ['Bob', 104, 'Joins'],
      ['Chen', 105, 'Untitled'],
      ['Dana', null, null],
    ],
  },
  leftJoinWhere: {
    engine: 'sqlite',
    sql: `SELECT u.name, p.id AS post_id, p.title
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE p.status = 'published'
ORDER BY u.id, p.id;`,
    columns: ['name', 'post_id', 'title'],
    rows: [
      ['Alice', 101, 'Hello'],
      ['Alice', 103, 'Sets'],
      ['Bob', 104, 'Joins'],
    ],
  },
  leftJoinOn: {
    engine: 'sqlite',
    sql: `SELECT u.name, p.id AS post_id, p.title
FROM users u
LEFT JOIN posts p
  ON p.user_id = u.id
  AND p.status = 'published'
ORDER BY u.id, p.id;`,
    columns: ['name', 'post_id', 'title'],
    rows: [
      ['Alice', 101, 'Hello'],
      ['Alice', 103, 'Sets'],
      ['Bob', 104, 'Joins'],
      ['Chen', null, null],
      ['Dana', null, null],
    ],
  },
  joinRepeats: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE p.status = 'published'
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [
      [1, 'Alice'],
      [1, 'Alice'],
      [2, 'Bob'],
    ],
  },
  semiJoinExists: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM posts p
  WHERE p.user_id = u.id
    AND p.status = 'published'
)
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [
      [1, 'Alice'],
      [2, 'Bob'],
    ],
  },
  semiJoinIn: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
WHERE u.id IN (
  SELECT p.user_id
  FROM posts p
  WHERE p.status = 'published'
)
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [
      [1, 'Alice'],
      [2, 'Bob'],
    ],
  },
  antiJoinNotExists: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM posts p
  WHERE p.user_id = u.id
)
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [[4, 'Dana']],
  },
  antiJoinNotIn: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
WHERE u.id NOT IN (
  SELECT p.user_id
  FROM posts p
)
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [],
  },
  antiJoinNotInFixed: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
WHERE u.id NOT IN (
  SELECT p.user_id
  FROM posts p
  WHERE p.user_id IS NOT NULL
)
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [[4, 'Dana']],
  },
  antiJoinLeftJoin: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE p.id IS NULL
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [[4, 'Dana']],
  },
  authors: {
    engine: 'sqlite',
    sql: `SELECT user_id
FROM posts
WHERE status = 'published'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1], [1], [2]],
  },
  buyers: {
    engine: 'sqlite',
    sql: `SELECT user_id
FROM orders
WHERE status = 'completed'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1], [1], [3], [3]],
  },
  union: {
    engine: 'sqlite',
    sql: `SELECT user_id FROM posts WHERE status = 'published'
UNION
SELECT user_id FROM orders WHERE status = 'completed'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1], [2], [3]],
  },
  unionAll: {
    engine: 'sqlite',
    sql: `SELECT user_id FROM posts WHERE status = 'published'
UNION ALL
SELECT user_id FROM orders WHERE status = 'completed'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1], [1], [1], [1], [2], [3], [3]],
  },
  intersect: {
    engine: 'sqlite',
    sql: `SELECT user_id FROM posts WHERE status = 'published'
INTERSECT
SELECT user_id FROM orders WHERE status = 'completed'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1]],
  },
  except: {
    engine: 'sqlite',
    sql: `SELECT user_id FROM posts WHERE status = 'published'
EXCEPT
SELECT user_id FROM orders WHERE status = 'completed'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[2]],
  },
  exceptReversed: {
    engine: 'sqlite',
    sql: `SELECT user_id FROM orders WHERE status = 'completed'
EXCEPT
SELECT user_id FROM posts WHERE status = 'published'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[3]],
  },
  groupBy: {
    engine: 'sqlite',
    sql: `SELECT
  user_id,
  COUNT(*) AS orders,
  SUM(total) AS spent
FROM orders
GROUP BY user_id
ORDER BY user_id;`,
    columns: ['user_id', 'orders', 'spent'],
    rows: [
      [1, 3, 95],
      [2, 2, 75],
      [3, 3, 90],
    ],
  },
  groupByNull: {
    engine: 'sqlite',
    sql: `SELECT user_id, COUNT(*) AS posts
FROM posts
GROUP BY user_id
ORDER BY user_id;`,
    columns: ['user_id', 'posts'],
    rows: [
      [null, 1],
      [1, 3],
      [2, 1],
      [3, 1],
    ],
  },
  window: {
    engine: 'sqlite',
    sql: `SELECT
  id,
  user_id,
  total,
  SUM(total) OVER (PARTITION BY user_id) AS user_total
FROM orders
ORDER BY user_id, id;`,
    columns: ['id', 'user_id', 'total', 'user_total'],
    rows: [
      [1, 1, 30, 95],
      [2, 1, 45, 95],
      [3, 1, 20, 95],
      [4, 2, 60, 75],
      [5, 2, 15, 75],
      [6, 3, 25, 90],
      [7, 3, 25, 90],
      [8, 3, 40, 90],
    ],
  },
  composedExists: {
    engine: 'sqlite',
    sql: `SELECT u.id, u.name
FROM users u
WHERE EXISTS (
  SELECT 1 FROM posts p
  WHERE p.user_id = u.id AND p.status = 'published'
)
AND NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.status = 'pending'
)
AND (
  SELECT COUNT(*) FROM orders o
  WHERE o.user_id = u.id
) >= 2
ORDER BY u.id;`,
    columns: ['id', 'name'],
    rows: [[1, 'Alice']],
  },
  composedSets: {
    engine: 'sqlite',
    sql: `SELECT user_id FROM posts WHERE status = 'published'
INTERSECT
SELECT user_id FROM orders GROUP BY user_id HAVING COUNT(*) >= 2
EXCEPT
SELECT user_id FROM orders WHERE status = 'pending'
ORDER BY user_id;`,
    columns: ['user_id'],
    rows: [[1]],
  },
  nPlusOneUsers: {
    engine: 'sqlite',
    sql: `SELECT id, name
FROM users
ORDER BY id;`,
    columns: ['id', 'name'],
    rows: [
      [1, 'Alice'],
      [2, 'Bob'],
      [3, 'Chen'],
      [4, 'Dana'],
    ],
  },
  nPlusOnePosts: {
    engine: 'sqlite',
    sql: `SELECT id, title
FROM posts
WHERE user_id = 1
ORDER BY id;`,
    columns: ['id', 'title'],
    rows: [
      [101, 'Hello'],
      [102, 'Draft notes'],
      [103, 'Sets'],
    ],
  },
  batchPosts: {
    engine: 'sqlite',
    sql: `SELECT user_id, id, title
FROM posts
WHERE user_id IN (1, 2, 3, 4)
ORDER BY user_id, id;`,
    columns: ['user_id', 'id', 'title'],
    rows: [
      [1, 101, 'Hello'],
      [1, 102, 'Draft notes'],
      [1, 103, 'Sets'],
      [2, 104, 'Joins'],
      [3, 105, 'Untitled'],
    ],
  },
  dashboard: {
    engine: 'sqlite',
    sql: `SELECT
  u.id,
  u.name,
  COUNT(p.id) AS post_count,
  MAX(p.created_at) AS latest_post
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;`,
    columns: ['id', 'name', 'post_count', 'latest_post'],
    rows: [
      [1, 'Alice', 3, '2026-09-20'],
      [2, 'Bob', 1, '2026-09-18'],
      [3, 'Chen', 1, '2026-09-10'],
      [4, 'Dana', 0, null],
    ],
  },
  dashboardCountStar: {
    engine: 'sqlite',
    sql: `SELECT
  u.id,
  u.name,
  COUNT(*) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;`,
    columns: ['id', 'name', 'post_count'],
    rows: [
      [1, 'Alice', 3],
      [2, 'Bob', 1],
      [3, 'Chen', 1],
      [4, 'Dana', 1],
    ],
  },
  fanOut: {
    engine: 'sqlite',
    sql: `SELECT
  u.name,
  COUNT(p.id) AS posts,
  COUNT(o.id) AS orders,
  SUM(o.total) AS spent
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;`,
    columns: ['name', 'posts', 'orders', 'spent'],
    rows: [
      ['Alice', 9, 9, 285],
      ['Bob', 2, 2, 75],
      ['Chen', 3, 3, 90],
      ['Dana', 0, 0, null],
    ],
  },
  fanOutDistinct: {
    engine: 'sqlite',
    sql: `SELECT
  u.name,
  COUNT(DISTINCT p.id) AS posts,
  COUNT(DISTINCT o.id) AS orders,
  SUM(DISTINCT o.total) AS spent
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;`,
    columns: ['name', 'posts', 'orders', 'spent'],
    rows: [
      ['Alice', 3, 3, 95],
      ['Bob', 1, 2, 75],
      ['Chen', 1, 3, 65],
      ['Dana', 0, 0, null],
    ],
  },
  fanOutFixed: {
    engine: 'sqlite',
    sql: `SELECT
  u.name,
  (SELECT COUNT(*) FROM posts p
    WHERE p.user_id = u.id) AS posts,
  (SELECT COUNT(*) FROM orders o
    WHERE o.user_id = u.id) AS orders,
  (SELECT SUM(o.total) FROM orders o
    WHERE o.user_id = u.id) AS spent
FROM users u
ORDER BY u.id;`,
    columns: ['name', 'posts', 'orders', 'spent'],
    rows: [
      ['Alice', 3, 3, 95],
      ['Bob', 1, 2, 75],
      ['Chen', 1, 3, 90],
      ['Dana', 0, 0, null],
    ],
  },
  fanOutGrouped: {
    engine: 'sqlite',
    sql: `SELECT
  u.name,
  COALESCE(p.posts, 0) AS posts,
  COALESCE(o.orders, 0) AS orders,
  o.spent
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS posts
  FROM posts
  GROUP BY user_id
) p ON p.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS orders, SUM(total) AS spent
  FROM orders
  GROUP BY user_id
) o ON o.user_id = u.id
ORDER BY u.id;`,
    columns: ['name', 'posts', 'orders', 'spent'],
    rows: [
      ['Alice', 3, 3, 95],
      ['Bob', 1, 2, 75],
      ['Chen', 1, 3, 90],
      ['Dana', 0, 0, null],
    ],
  },
  whereThenHaving: {
    engine: 'sqlite',
    sql: `SELECT user_id, SUM(total) AS spent
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING SUM(total) >= 50
ORDER BY user_id;`,
    columns: ['user_id', 'spent'],
    rows: [
      [1, 50],
      [3, 50],
    ],
  },
  havingOnly: {
    engine: 'sqlite',
    sql: `SELECT user_id, SUM(total) AS spent
FROM orders
GROUP BY user_id
HAVING SUM(total) >= 50
ORDER BY user_id;`,
    columns: ['user_id', 'spent'],
    rows: [
      [1, 95],
      [2, 75],
      [3, 90],
    ],
  },
  filterCounts: {
    engine: 'sqlite',
    sql: `SELECT
  user_id,
  COUNT(*) AS orders,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'canceled') AS canceled,
  SUM(total) FILTER (WHERE status = 'completed') AS revenue
FROM orders
GROUP BY user_id
ORDER BY user_id;`,
    columns: ['user_id', 'orders', 'completed', 'canceled', 'revenue'],
    rows: [
      [1, 3, 2, 1, 50],
      [2, 2, 0, 1, null],
      [3, 3, 2, 1, 50],
    ],
  },
  caseCounts: {
    engine: 'sqlite',
    sql: `SELECT
  user_id,
  COUNT(*) AS orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
  COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS canceled,
  SUM(CASE WHEN status = 'completed' THEN total END) AS revenue
FROM orders
GROUP BY user_id
ORDER BY user_id;`,
    columns: ['user_id', 'orders', 'completed', 'canceled', 'revenue'],
    rows: [
      [1, 3, 2, 1, 50],
      [2, 2, 0, 1, null],
      [3, 3, 2, 1, 50],
    ],
  },
  existsColumn: {
    engine: 'sqlite',
    sql: `SELECT
  u.id,
  u.name,
  EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.user_id = u.id
      AND p.status = 'published'
  ) AS has_published
FROM users u
ORDER BY u.id;`,
    columns: ['id', 'name', 'has_published'],
    rows: [
      [1, 'Alice', 1],
      [2, 'Bob', 1],
      [3, 'Chen', 0],
      [4, 'Dana', 0],
    ],
  },
  existsOne: {
    engine: 'sqlite',
    sql: `SELECT EXISTS (
  SELECT 1
  FROM posts
  WHERE user_id = 1
) AS has_posts;`,
    columns: ['has_posts'],
    rows: [[1]],
  },
  countOne: {
    engine: 'sqlite',
    sql: `SELECT COUNT(*) AS post_count
FROM posts
WHERE user_id = 1;`,
    columns: ['post_count'],
    rows: [[3]],
  },
  topTwo: {
    engine: 'sqlite',
    sql: `SELECT user_id, id, total
FROM (
  SELECT
    user_id,
    id,
    total,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY total DESC, id
    ) AS position
  FROM orders
) ranked
WHERE position <= 2
ORDER BY user_id, position;`,
    columns: ['user_id', 'id', 'total'],
    rows: [
      [1, 2, 45],
      [1, 1, 30],
      [2, 4, 60],
      [2, 5, 15],
      [3, 8, 40],
      [3, 6, 25],
    ],
  },
  rankings: {
    engine: 'sqlite',
    sql: `SELECT
  id,
  total,
  ROW_NUMBER() OVER (ORDER BY total DESC, id) AS row_number,
  RANK() OVER (ORDER BY total DESC) AS rank,
  DENSE_RANK() OVER (ORDER BY total DESC) AS dense_rank
FROM orders
WHERE user_id = 3
ORDER BY total DESC, id;`,
    columns: ['id', 'total', 'row_number', 'rank', 'dense_rank'],
    rows: [
      [8, 40, 1, 1, 1],
      [6, 25, 2, 2, 2],
      [7, 25, 3, 2, 2],
    ],
  },
  runningPeers: {
    engine: 'sqlite',
    sql: `SELECT
  id,
  created_at,
  total,
  SUM(total) OVER (ORDER BY created_at) AS running
FROM orders
ORDER BY created_at, id;`,
    columns: ['id', 'created_at', 'total', 'running'],
    rows: [
      [1, '2026-09-01', 30, 30],
      [4, '2026-09-02', 60, 90],
      [2, '2026-09-03', 45, 135],
      [6, '2026-09-05', 25, 160],
      [3, '2026-09-10', 20, 205],
      [7, '2026-09-10', 25, 205],
      [5, '2026-09-12', 15, 220],
      [8, '2026-09-14', 40, 260],
    ],
  },
  runningRows: {
    engine: 'sqlite',
    sql: `SELECT
  id,
  created_at,
  total,
  SUM(total) OVER (
    ORDER BY created_at, id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running
FROM orders
ORDER BY created_at, id;`,
    columns: ['id', 'created_at', 'total', 'running'],
    rows: [
      [1, '2026-09-01', 30, 30],
      [4, '2026-09-02', 60, 90],
      [2, '2026-09-03', 45, 135],
      [6, '2026-09-05', 25, 160],
      [3, '2026-09-10', 20, 180],
      [7, '2026-09-10', 25, 205],
      [5, '2026-09-12', 15, 220],
      [8, '2026-09-14', 40, 260],
    ],
  },
  runningPerUser: {
    engine: 'sqlite',
    sql: `SELECT
  user_id,
  id,
  total,
  SUM(total) OVER (
    PARTITION BY user_id
    ORDER BY created_at, id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running
FROM orders
ORDER BY user_id, created_at, id;`,
    columns: ['user_id', 'id', 'total', 'running'],
    rows: [
      [1, 1, 30, 30],
      [1, 2, 45, 75],
      [1, 3, 20, 95],
      [2, 4, 60, 60],
      [2, 5, 15, 75],
      [3, 6, 25, 25],
      [3, 7, 25, 50],
      [3, 8, 40, 90],
    ],
  },
  label: {
    engine: 'sqlite',
    sql: `SELECT
  id,
  total,
  CASE
    WHEN total >= 50 THEN 'large'
    WHEN total >= 25 THEN 'medium'
    ELSE 'small'
  END AS size
FROM orders
ORDER BY id;`,
    columns: ['id', 'total', 'size'],
    rows: [
      [1, 30, 'medium'],
      [2, 45, 'medium'],
      [3, 20, 'small'],
      [4, 60, 'large'],
      [5, 15, 'small'],
      [6, 25, 'medium'],
      [7, 25, 'medium'],
      [8, 40, 'medium'],
    ],
  },
  distinctStatuses: {
    engine: 'sqlite',
    sql: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
    columns: ['status'],
    rows: [['canceled'], ['completed'], ['pending']],
  },
  distinctPairs: {
    engine: 'sqlite',
    sql: `SELECT DISTINCT user_id, status
FROM orders
ORDER BY user_id, status;`,
    columns: ['user_id', 'status'],
    rows: [
      [1, 'canceled'],
      [1, 'completed'],
      [2, 'canceled'],
      [2, 'pending'],
      [3, 'canceled'],
      [3, 'completed'],
    ],
  },
  latestPost: {
    engine: 'sqlite',
    sql: `SELECT user_id, id, title, created_at
FROM (
  SELECT
    user_id,
    id,
    title,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id DESC
    ) AS position
  FROM posts
  WHERE user_id IS NOT NULL
) newest_first
WHERE position = 1
ORDER BY user_id;`,
    columns: ['user_id', 'id', 'title', 'created_at'],
    rows: [
      [1, 103, 'Sets', '2026-09-20'],
      [2, 104, 'Joins', '2026-09-18'],
      [3, 105, 'Untitled', '2026-09-10'],
    ],
  },
  distinctOn: {
    engine: 'postgres',
    sql: `SELECT DISTINCT ON (user_id)
  user_id, id, title, created_at
FROM posts
WHERE user_id IS NOT NULL
ORDER BY user_id, created_at DESC, id DESC;`,
    columns: ['user_id', 'id', 'title', 'created_at'],
    rows: [
      [1, 103, 'Sets', '2026-09-20'],
      [2, 104, 'Joins', '2026-09-18'],
      [3, 105, 'Untitled', '2026-09-10'],
    ],
  },
  havingAlias: {
    engine: 'sqlite',
    sql: `SELECT user_id, SUM(total) AS spent
FROM orders
GROUP BY user_id
HAVING spent >= 50
ORDER BY user_id;`,
    columns: ['user_id', 'spent'],
    rows: [
      [1, 95],
      [2, 75],
      [3, 90],
    ],
  },
} as const satisfies Readonly<Record<string, SqlExample>>;

type SqlExampleKey = keyof typeof SQL_EXAMPLES;

type SqlTableName = keyof typeof SQL_TABLES;

export { SQL_EXAMPLES, SQL_SCHEMA, SQL_TABLES };

export type { SqlEngine, SqlExample, SqlExampleKey, SqlRow, SqlTable, SqlTableName, SqlValue };
