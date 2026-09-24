<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Table from '$lib/components/Table.svelte';
  import type { BadgeVariant } from '$lib/components/classes';
  import DemoSection from './DemoSection.svelte';

  type Row = {
    readonly id: string;
    readonly customer: string;
    readonly status: string;
    readonly badge: BadgeVariant;
    readonly amount: string;
  };

  const ROWS: readonly Row[] = [
    {
      id: 'INV-1042',
      customer: 'Northwind',
      status: 'Paid',
      badge: 'success',
      amount: '$4,200.00',
    },
    {
      id: 'INV-1043',
      customer: 'Globex',
      status: 'Pending',
      badge: 'warning',
      amount: '$1,180.50',
    },
    { id: 'INV-1044', customer: 'Initech', status: 'Overdue', badge: 'danger', amount: '$960.00' },
    {
      id: 'INV-1045',
      customer: 'Umbrella',
      status: 'Draft',
      badge: 'neutral',
      amount: '$12,400.00',
    },
  ];
</script>

{#snippet head()}
  <thead>
    <tr><th>Invoice</th><th>Customer</th><th>Status</th><th class="table-numeric">Amount</th></tr>
  </thead>
{/snippet}

{#snippet body()}
  <tbody>
    {#each ROWS as row (row.id)}
      <tr>
        <td class="mono">{row.id}</td>
        <td>{row.customer}</td>
        <td><Badge variant={row.badge}>{row.status}</Badge></td>
        <td class="table-numeric">{row.amount}</td>
      </tr>
    {/each}
  </tbody>
{/snippet}

{#snippet richCaption()}
  Compact, with a <em>snippet</em> caption
{/snippet}

<DemoSection
  id="table"
  title="Table"
  classes={['table-wrapper', 'table', 'table-striped', 'table-compact', 'table-numeric']}
>
  <Table caption="Default">
    {@render head()}
    {@render body()}
  </Table>
  <Table striped caption="Striped">
    {@render head()}
    {@render body()}
  </Table>
  <Table compact caption={richCaption}>
    {@render head()}
    {@render body()}
  </Table>
</DemoSection>
