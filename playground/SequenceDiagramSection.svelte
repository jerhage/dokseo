<script lang="ts">
  import Card from '../components/Card.svelte';
  import SequenceDiagram from '../components/SequenceDiagram.svelte';
  import type { SequenceParticipant, SequenceStep } from '../components/sequence';
  import DemoSection from './DemoSection.svelte';

  const participants: readonly SequenceParticipant[] = [
    { label: 'Client', tone: 'primary' },
    { label: 'Server', tone: 'accent' },
    { label: 'Authority' },
  ];

  const steps: readonly SequenceStep[] = [
    { kind: 'message', from: 0, to: 1, label: 'ClientHello' },
    { kind: 'message', from: 1, to: 0, label: 'ServerHello, Certificate', emphasis: 'active' },
    { kind: 'message', from: 0, to: 2, label: 'Check the certificate' },
    { kind: 'message', from: 2, to: 0, label: 'Valid', dashed: true },
    { kind: 'message', from: 0, to: 0, label: 'Derive the session keys' },
    { kind: 'note', from: 0, to: 1, text: 'Both sides now hold the session keys' },
    { kind: 'message', from: 0, to: 1, label: 'Finished' },
    { kind: 'message', from: 1, to: 0, label: 'Finished', dashed: true },
  ];
</script>

<DemoSection
  id="sequence-diagram"
  title="Sequence diagram"
  classes={[
    'sequence',
    'sequence-participant',
    'sequence-lifeline',
    'sequence-message',
    'sequence-message-dashed',
    'sequence-message-self',
    'sequence-message-active',
    'sequence-note',
  ]}
>
  <p class="text-sm text-muted">
    Participants across the top, messages down the page. A message to the left runs in reverse, a
    dashed one is a reply, and a message to the same participant loops back. Each message reads
    "Client to Server:" to a screen reader.
  </p>
  <Card>
    <SequenceDiagram label="A TLS-like handshake" {participants} {steps} />
  </Card>
</DemoSection>
