<script lang="ts">
  import Diagram from '../components/Diagram.svelte';
  import type { DiagramBox } from '../components/diagram';
  import SequenceDiagram from '../components/SequenceDiagram.svelte';
  import type { SequenceMessage, SequenceParticipant } from '../components/sequence';
  import { stepEmphasis } from '../components/step-through';
  import StepThrough from '../components/StepThrough.svelte';
  import DemoSection from './DemoSection.svelte';

  const participants: readonly SequenceParticipant[] = [{ label: 'Client' }, { label: 'Server' }];

  const handshake: readonly Omit<SequenceMessage, 'emphasis'>[] = [
    { kind: 'message', from: 0, to: 1, label: 'ClientHello' },
    { kind: 'message', from: 1, to: 0, label: 'ServerHello, Certificate' },
    { kind: 'message', from: 0, to: 1, label: 'Finished' },
    { kind: 'message', from: 1, to: 0, label: 'Finished', dashed: true },
  ];

  const handshakeCaptions: readonly string[] = [
    'The client opens by saying which versions it speaks.',
    'The server answers with its certificate so the client can check who it is talking to.',
    'The client confirms the handshake.',
    'The server confirms it too.',
  ];

  const client: DiagramBox = { kind: 'box', label: 'Client', x: 20, y: 40, width: 120, height: 48 };
  const router: DiagramBox = {
    kind: 'box',
    label: 'Router',
    tone: 'primary',
    x: 220,
    y: 40,
    width: 120,
    height: 48,
  };
  const server: DiagramBox = {
    kind: 'box',
    label: 'Server',
    x: 420,
    y: 40,
    width: 120,
    height: 48,
  };
  const hops: readonly DiagramBox[] = [client, router, server];

  const routeCaptions: readonly string[] = [
    'The client hands the packet to the router.',
    'The router forwards the packet to the server.',
  ];
</script>

<DemoSection
  id="step-through"
  title="Step through"
  classes={[
    'step-through',
    'step-through-stage',
    'step-through-caption',
    'step-through-controls',
    'step-through-counter',
    'step-through-dimmed',
  ]}
>
  <p class="text-sm text-muted">
    Previous and next buttons, a counter and a caption announced politely. The content receives the
    current step and marks what is active; everything else is dimmed.
  </p>
  <StepThrough label="Handshake, step by step" captions={handshakeCaptions}>
    {#snippet children(step)}
      <SequenceDiagram
        label="A TLS-like handshake"
        {participants}
        steps={handshake.map((message, index) => ({
          ...message,
          emphasis: stepEmphasis(index, step),
        }))}
      />
    {/snippet}
  </StepThrough>
  <StepThrough label="Route, step by step" captions={routeCaptions}>
    {#snippet children(step)}
      <Diagram
        label="Route of a packet"
        scrollLabel="Route of a packet"
        width={560}
        height={120}
        nodes={hops.map((box, index) => ({ ...box, emphasis: stepEmphasis(index, step + 1) }))}
        edges={[
          { from: client, to: router, label: 'packet', emphasis: stepEmphasis(0, step) },
          { from: router, to: server, emphasis: stepEmphasis(1, step) },
        ]}
      />
    {/snippet}
  </StepThrough>
</DemoSection>
