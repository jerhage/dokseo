const TO_FULL_WIDTH = 0xfee0;

function fullWidthOf(halfWidth: string): string {
  const code = halfWidth.codePointAt(0);
  return code === undefined ? halfWidth : String.fromCodePoint(code + TO_FULL_WIDTH);
}

export function japaneseOcrText(decoded: string): string {
  return decoded
    .replace(/\s+/gu, '')
    .replace(/…/gu, '...')
    .replace(/[・.]{2,}/gu, (run) => '.'.repeat(run.length))
    .replace(/[!-~]/gu, fullWidthOf);
}
