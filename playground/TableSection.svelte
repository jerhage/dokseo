<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import Dropdown from '../components/Dropdown.svelte';
  import DropdownItem from '../components/DropdownItem.svelte';
  import Ellipsis from '../components/icons/Ellipsis.svelte';
  import Table from '../components/Table.svelte';
  import TableBody from '../components/TableBody.svelte';
  import TableCell from '../components/TableCell.svelte';
  import TableHeader from '../components/TableHeader.svelte';
  import TableHeaderCell from '../components/TableHeaderCell.svelte';
  import TableRow from '../components/TableRow.svelte';
  import type { BadgeVariant } from '../components/classes';
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
  <TableHeader>
    <TableRow>
      <TableHeaderCell>Invoice</TableHeaderCell>
      <TableHeaderCell>Customer</TableHeaderCell>
      <TableHeaderCell>Status</TableHeaderCell>
      <TableHeaderCell numeric>Amount</TableHeaderCell>
      <TableHeaderCell actions><span class="visually-hidden">Actions</span></TableHeaderCell>
    </TableRow>
  </TableHeader>
{/snippet}

{#snippet body()}
  <TableBody>
    {#each ROWS as row (row.id)}
      <TableRow>
        <TableCell class="mono">{row.id}</TableCell>
        <TableCell>{row.customer}</TableCell>
        <TableCell><Badge variant={row.badge}>{row.status}</Badge></TableCell>
        <TableCell numeric>{row.amount}</TableCell>
        <TableCell actions>
          <Dropdown
            size="sm"
            variant="ghost"
            align="end"
            icon={Ellipsis}
            label="Actions for {row.id}"
          >
            <DropdownItem>Open</DropdownItem>
            <DropdownItem danger>Void</DropdownItem>
          </Dropdown>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
{/snippet}

{#snippet richCaption()}
  Compact, with a <em>snippet</em> caption
{/snippet}

<DemoSection
  id="table"
  title="Table"
  classes={[
    'table-wrapper',
    'table',
    'table-striped',
    'table-sm',
    'table-numeric',
    'table-actions',
  ]}
>
  <Table caption="Default">
    {@render head()}
    {@render body()}
  </Table>
  <Table striped caption="Striped">
    {@render head()}
    {@render body()}
  </Table>
  <Table size="sm" caption={richCaption}>
    {@render head()}
    {@render body()}
  </Table>
</DemoSection>
