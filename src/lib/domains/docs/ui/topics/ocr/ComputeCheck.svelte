<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { useContainer } from '$lib/context';
  import {
    COMPUTE_CHOICES,
    chosenDevice,
    computeChoiceName,
    computeDetectionNote,
  } from '$lib/domains/recognition/domain/engine/compute-choice';
  import type {
    ComputeChoice,
    GpuDetection,
  } from '$lib/domains/recognition/domain/engine/compute-choice';
  import { deviceName } from '$lib/domains/recognition/domain/engine/recognizer-session';
  import { defaultWasmThreads } from '../../../domain/ocr-compute';
  import DocsDemo from '../../DocsDemo.svelte';

  const recognition = useContainer().recognition;

  type ComputeReading = { readonly detection: GpuDetection; readonly stored: ComputeChoice };

  async function readCompute(): Promise<ComputeReading> {
    const [detection, setup] = await Promise.all([
      recognition.detectCompute(),
      recognition.readRecognizerSetup('ja'),
    ]);
    const stored = setup.kind === 'success' ? setup.choice.compute : 'cpu';
    return { detection, stored };
  }

  const cores = typeof navigator === 'undefined' ? 0 : navigator.hardwareConcurrency;
</script>

<DocsDemo label="This browser" resettable resetLabel="Check again">
  {#await readCompute()}
    <p class="m-0 text-sm text-muted">Requesting a WebGPU adapter…</p>
  {:then { detection, stored }}
    <p class="row wrap items-center gap-2 m-0 text-sm">
      <code>navigator.gpu</code>
      <Badge>{'gpu' in navigator ? 'present' : 'absent'}</Badge>
      <code>requestAdapter()</code>
      <Badge variant={detection.available ? 'success' : 'warning'}>
        {detection.available ? (detection.description ?? 'an adapter') : 'no adapter'}
      </Badge>
    </p>
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Compute setting</TableHeaderCell>
          <TableHeaderCell>Runs on, here</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each COMPUTE_CHOICES as choice (choice)}
          <TableRow>
            <TableCell>
              {computeChoiceName(choice)}
              {#if choice === stored}<Badge class="ms-1">your setting</Badge>{/if}
            </TableCell>
            <TableCell>{deviceName(chosenDevice(choice, detection.available))}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    <p class="m-0 text-sm">
      Engine settings would say: <q>{computeDetectionNote(detection, stored)}</q>
    </p>
  {/await}
  <p class="row wrap items-center gap-2 m-0 text-sm">
    <code>crossOriginIsolated</code>
    <Badge variant={crossOriginIsolated ? 'success' : 'warning'}>{crossOriginIsolated}</Badge>
    <code>hardwareConcurrency</code>
    <Badge>{cores}</Badge>
    <span>ONNX Runtime's default thread count</span>
    <Badge>{defaultWasmThreads(crossOriginIsolated, cores)}</Badge>
  </p>
  {#snippet caption()}
    Read from this page as it runs, with the detection code the engine settings screen uses. The
    worker requests its own adapter again when it opens the model.
  {/snippet}
</DocsDemo>
