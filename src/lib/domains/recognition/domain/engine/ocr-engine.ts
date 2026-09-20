import { match } from 'ts-pattern';
import { languageName } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { loadVerb } from '../model/model-load';
import type { ModelLoad } from '../model/model-load';
import { downloadMb, knownModel, reads } from '../model/model-footprint';
import type { ModelFootprint } from '../model/model-footprint';
import { deviceName } from './recognizer-session';
import type { RecognizerSession } from './recognizer-session';

export type OcrEngineId = 'on-device' | 'ocr-server' | 'openai-endpoint';

export type OcrEngine = {
  readonly id: OcrEngineId;
  readonly name: string;
  readonly about: string;
  readonly kind: string;
  readonly summary: string;
  readonly installed: boolean;
  readonly footnote: string;
};

export const ON_DEVICE_ENGINE: OcrEngine = {
  id: 'on-device',
  name: 'On-device',
  about: 'the on-device engine',
  kind: 'In this app',
  summary:
    'Runs the recognition model in this app. Works offline once the weights are here, and costs a one-time download.',
  installed: true,
  footnote: 'Nobody has timed this in a browser yet, so no speed is claimed.',
};

export const OCR_ENGINES: readonly OcrEngine[] = [
  ON_DEVICE_ENGINE,
  {
    id: 'ocr-server',
    name: 'OCR server',
    about: 'the OCR server',
    kind: 'A machine you run',
    summary:
      'Would point at a machine you run — your own box, or a homelab — and send it each crop instead of downloading a model.',
    installed: false,
    footnote: 'Not built yet. The lines above say what it would cost you, not what it does.',
  },
  {
    id: 'openai-endpoint',
    name: 'OpenAI-compatible endpoint',
    about: 'the OpenAI-compatible endpoint',
    kind: 'A provider you pay',
    summary:
      'Would send each crop to a service that answers OpenAI-compatible requests, and that provider would bill you for it.',
    installed: false,
    footnote: 'Not built yet. The lines above say what it would cost you, not what it does.',
  },
];

export type TradeAspect = 'privacy' | 'cost' | 'setup' | 'quality';

export type TradeVerdict = 'good' | 'caveat';

export type TradeOff = {
  readonly aspect: TradeAspect;
  readonly verdict: TradeVerdict;
  readonly value: string;
};

export function tradeAspectName(aspect: TradeAspect): string {
  return match(aspect)
    .with('privacy', () => 'Privacy')
    .with('cost', () => 'Cost')
    .with('setup', () => 'Setup')
    .with('quality', () => 'Quality')
    .exhaustive();
}

function onDeviceTradeOffs(model: ModelFootprint | null): readonly TradeOff[] {
  return [
    { aspect: 'privacy', verdict: 'good', value: 'Pages never leave this device' },
    { aspect: 'cost', verdict: 'good', value: 'Free, and no account' },
    {
      aspect: 'setup',
      verdict: 'caveat',
      value: model === null ? 'A model download, once' : `${downloadMb(model)} MB download, once`,
    },
    {
      aspect: 'quality',
      verdict: 'caveat',
      value: model === null ? 'Nothing here has measured it.' : model.quality,
    },
  ];
}

const SERVER_TRADE_OFFS: readonly TradeOff[] = [
  { aspect: 'privacy', verdict: 'caveat', value: 'The crop you select is sent to that machine' },
  { aspect: 'cost', verdict: 'good', value: 'Nothing to pay here; you run the machine' },
  {
    aspect: 'setup',
    verdict: 'caveat',
    value: 'No download here. You install and run the server.',
  },
  {
    aspect: 'quality',
    verdict: 'caveat',
    value: 'Whatever model that server runs. Nothing here has measured it.',
  },
];

const ENDPOINT_TRADE_OFFS: readonly TradeOff[] = [
  {
    aspect: 'privacy',
    verdict: 'caveat',
    value: 'The crop you select is uploaded to the provider',
  },
  {
    aspect: 'cost',
    verdict: 'caveat',
    value: 'The provider bills you per request. This app never quotes a price.',
  },
  { aspect: 'setup', verdict: 'caveat', value: 'No download. You supply an endpoint and a key.' },
  {
    aspect: 'quality',
    verdict: 'caveat',
    value: 'Depends on the model behind the endpoint. Nothing here has measured it.',
  },
];

export function tradeOffsOf(
  engine: OcrEngineId,
  model: ModelFootprint | null,
): readonly TradeOff[] {
  return match(engine)
    .with('on-device', () => onDeviceTradeOffs(model))
    .with('ocr-server', () => SERVER_TRADE_OFFS)
    .with('openai-endpoint', () => ENDPOINT_TRADE_OFFS)
    .exhaustive();
}

export function engineMismatch(
  session: RecognizerSession | null,
  language: Language | null,
): string | null {
  if (session === null || language === null) return null;

  const running = knownModel(session.modelId);
  if (running === null || reads(running, language)) return null;

  return `${running.label} does not read ${languageName(language)}, so what it returns will not be this book's text.`;
}

export type EngineTone = 'ready' | 'busy' | 'quiet' | 'bad';

export type EngineStatus = {
  readonly tone: EngineTone;
  readonly label: string;
  readonly note: string;
};

export type EngineState = {
  readonly stored: boolean;
  readonly opening: boolean;
  readonly load: ModelLoad | null;
  readonly session: RecognizerSession | null;
  readonly failure: string | null;
  readonly paused: boolean;
  readonly cancelled: boolean;
  readonly partlyDownloaded: boolean;
};

export const NOT_INSTALLED: EngineStatus = {
  tone: 'quiet',
  label: 'Not installed',
  note: 'This app cannot talk to one yet, so it cannot be chosen.',
};

export function engineStatus(state: EngineState): EngineStatus {
  if (state.load !== null) {
    return {
      tone: 'busy',
      label: loadVerb(state.load.source),
      note:
        state.load.source === 'network'
          ? 'Fetching the weights over the network. Pausing keeps every byte already fetched.'
          : 'Reading weights already on this device into memory. Nothing is being fetched.',
    };
  }

  if (state.opening) {
    return {
      tone: 'busy',
      label: 'Opening',
      note: 'Starting the engine. Nothing is being downloaded.',
    };
  }

  if (state.failure !== null) {
    return {
      tone: 'bad',
      label: 'Not available',
      note: `The engine could not be opened: ${state.failure}`,
    };
  }

  if (state.session !== null) {
    return {
      tone: 'ready',
      label: 'Ready',
      note: `The weights are on this device and the engine is running on the ${deviceName(state.session.device)}.`,
    };
  }

  if (state.paused) {
    return {
      tone: 'quiet',
      label: 'Paused',
      note: 'The bytes already fetched are on this device. Resuming carries on from them.',
    };
  }

  if (state.cancelled) {
    return {
      tone: 'quiet',
      label: 'Cancelled',
      note: 'The load was stopped and the part-downloaded file was discarded.',
    };
  }

  if (state.partlyDownloaded) {
    return {
      tone: 'quiet',
      label: 'Part-downloaded',
      note: 'Part of the weights is on this device. Resuming carries on from what is here.',
    };
  }

  if (state.stored) {
    return {
      tone: 'quiet',
      label: 'Downloaded',
      note: 'The weights are on this device. The engine is not running yet.',
    };
  }

  return {
    tone: 'quiet',
    label: 'Not downloaded',
    note: 'The weights are not on this device. Your first capture downloads them, once you agree.',
  };
}
