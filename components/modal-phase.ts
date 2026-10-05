import { match } from 'ts-pattern';

type ModalPhase = 'closed' | 'open' | 'leaving';

type ModalEvent = 'show' | 'hide' | 'left' | 'closed';

type ModalEffect = 'none' | 'show-modal' | 'start-leaving' | 'close';

type ModalStep = {
  readonly phase: ModalPhase;
  readonly effect: ModalEffect;
};

function step(phase: ModalPhase, effect: ModalEffect): ModalStep {
  return { phase, effect };
}

function modalStep(phase: ModalPhase, event: ModalEvent): ModalStep {
  return match([phase, event] as const)
    .returnType<ModalStep>()
    .with(['closed', 'show'], () => step('open', 'show-modal'))
    .with(['leaving', 'show'], () => step('open', 'none'))
    .with(['open', 'hide'], () => step('leaving', 'start-leaving'))
    .with(['leaving', 'left'], () => step('closed', 'close'))
    .with(['closed', 'closed'], ['open', 'closed'], ['leaving', 'closed'], () =>
      step('closed', 'none'),
    )
    .with(
      ['open', 'show'],
      ['closed', 'hide'],
      ['leaving', 'hide'],
      ['open', 'left'],
      ['closed', 'left'],
      ([current]) => step(current, 'none'),
    )
    .exhaustive();
}

export { modalStep };
export type { ModalEffect, ModalEvent, ModalPhase, ModalStep };
