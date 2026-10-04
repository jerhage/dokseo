function jaOcrText(decoded: string): string {
  return decoded.replace(/\s+/gu, '');
}

export { jaOcrText };
