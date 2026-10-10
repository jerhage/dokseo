<script lang="ts">
  type Props = {
    stack: string;
    inlineSize?: string;
    fontSize?: string;
    text?: string;
    rect?: DOMRectReadOnly | undefined;
  };

  let {
    stack,
    inlineSize = 'max-content',
    fontSize = '1em',
    text = '',
    rect = $bindable(),
  }: Props = $props();
</script>

<span
  class="probe"
  aria-hidden="true"
  style:--demo-font={stack}
  style:--demo-size={fontSize}
  style:--probe-length={inlineSize}
  bind:contentRect={rect}>{text}</span
>
