import type { Container } from '$lib/container';
import type { Language } from '$lib/shared/language';
import type { ModelFootprint } from '../../domain/model/model-footprint';

async function readChosenFootprint(
  container: Container,
  language: Language,
): Promise<ModelFootprint | null> {
  const choice = await container.recognition.readRecognizerSetup(language).catch(() => null);

  return choice !== null && choice.ok ? choice.value.model : null;
}

export { readChosenFootprint };
