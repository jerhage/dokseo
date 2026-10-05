import { SQL_EXAMPLES } from '../../../domain/sql-examples';
import type { SqlEngine } from '../../../domain/sql-examples';
import { BUNDLE_SAMPLES } from '../production-builds/bundle-samples';
import { CONCEPT_EXAMPLES } from '../typescript-types/concept-examples';
import { TOOL_EXAMPLES } from '../typescript-types/tool-examples';

type RecordedCounts = {
  readonly sqlite: number;
  readonly postgres: number;
  readonly compiled: number;
  readonly bundles: number;
};

function examplesOn(engine: SqlEngine): number {
  return Object.values(SQL_EXAMPLES).filter((example) => example.engine === engine).length;
}

const RECORDED_COUNTS: RecordedCounts = {
  sqlite: examplesOn('sqlite'),
  postgres: examplesOn('postgres'),
  compiled: CONCEPT_EXAMPLES.length + TOOL_EXAMPLES.length,
  bundles: BUNDLE_SAMPLES.length,
};

export { RECORDED_COUNTS };
export type { RecordedCounts };
