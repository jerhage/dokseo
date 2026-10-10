import { CH_FONTS, REFERENCE_FONT_SIZE, fontLoadQuery } from '../../../domain/ch-unit';

const SAMPLE_GLYPHS = '0水';

async function loadChFonts(): Promise<void> {
  const loads = CH_FONTS.flatMap((font) =>
    font.primary === null
      ? []
      : [document.fonts.load(fontLoadQuery(font.primary, REFERENCE_FONT_SIZE), SAMPLE_GLYPHS)],
  );
  await Promise.all(loads);
}

export { loadChFonts };
