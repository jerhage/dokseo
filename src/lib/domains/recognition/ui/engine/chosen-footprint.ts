import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import { setupChoice } from '../../domain/engine/recognizer-setup';
import type { ModelFootprint } from '../../domain/model/model-footprint';

async function readChosenFootprint(
  container: Container,
  language: Language,
): Promise<ModelFootprint | null> {
  const choice = await container.recognition.readRecognizerSetup(language).catch(() => null);
  if (choice === null) return null;

  return choice.ok ? choice.value.model : setupChoice(language, null).model;
}

export { readChosenFootprint };
