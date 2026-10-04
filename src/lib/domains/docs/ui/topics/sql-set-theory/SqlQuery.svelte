<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import SqlResult from './SqlResult.svelte';
  import { rowCountLabel } from '../../../domain/sql-result';
  import type { SqlExample } from '../../../domain/sql-examples';

  type Props = {
    example: SqlExample;
    label: string;
  };

  let { example, label }: Props = $props();

  const caption = $derived(
    example.engine === 'postgres'
      ? `Postgres output, ${rowCountLabel(example.rows.length)}`
      : rowCountLabel(example.rows.length),
  );
</script>

<div class="stack-sm">
  <DocsCode code={example.sql} {label} />
  <SqlResult columns={example.columns} rows={example.rows} {caption} />
</div>
