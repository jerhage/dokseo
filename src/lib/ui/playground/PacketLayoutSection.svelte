<script lang="ts">
  import Card from '../components/Card.svelte';
  import PacketLayout from '../components/PacketLayout.svelte';
  import type { PacketRow } from '../components/packet';
  import DemoSection from './DemoSection.svelte';

  const rows: readonly PacketRow[] = [
    [
      { name: 'Version', detail: '4 bits', span: 4, tone: 'primary' },
      { name: 'Header length', detail: '4 bits', span: 4, tone: 'primary' },
      { name: 'Flags', detail: '8 bits', span: 8, tone: 'accent', emphasis: 'active' },
      { name: 'Total length', detail: '16 bits', span: 16 },
    ],
    [
      { name: 'Identification', detail: '16 bits', span: 16 },
      { name: 'Fragment', detail: '3 bits', span: 3, tone: 'warning' },
      { name: 'Offset', detail: '13 bits', span: 13, tone: 'warning' },
    ],
    [
      { name: 'Lifetime', detail: '8 bits', span: 8, tone: 'success' },
      { name: 'Protocol', detail: '8 bits', span: 8 },
      { name: 'Checksum', detail: '16 bits', span: 16, tone: 'danger' },
    ],
    [{ name: 'Source address', detail: '32 bits', span: 32 }],
    [{ name: 'Destination address', detail: '32 bits', span: 32 }],
    [{ name: 'Options', detail: 'variable', span: 32 }],
  ];
</script>

<DemoSection
  id="packet-layout"
  title="Packet layout"
  classes={[
    'packet',
    'packet-ruler',
    'packet-offset',
    'packet-row',
    'packet-field',
    'packet-field-primary',
    'packet-field-warning',
    'packet-field-active',
  ]}
>
  <p class="text-sm text-muted">
    A bit-numbered ruler over rows of fields. The spans of a row add up to the bits of a row, or the
    layout throws and names the row. The region scrolls sideways at phone width and takes the
    keyboard focus.
  </p>
  <Card>
    <PacketLayout label="A generic packet header" bits={32} offsets={[0, 8, 16, 24]} {rows} />
  </Card>
</DemoSection>
