export function japaneseOcrText(decoded: string): string {
  return decoded.replace(/\s+/gu, '');
}
