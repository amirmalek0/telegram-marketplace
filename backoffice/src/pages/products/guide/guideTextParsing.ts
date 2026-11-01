export function guidePoints(text: string): string[] {
  return text.split(/(?<=[.!؟])\s+/u).map(point => point.trim()).filter(Boolean);
}

export function guideTextParts(text: string): { text: string; isControl: boolean }[] {
  return text.split(/(«[^»]+»)/u).filter(Boolean).map(part => ({
    text: part.startsWith('«') && part.endsWith('»') ? part.slice(1, -1) : part,
    isControl: part.startsWith('«') && part.endsWith('»'),
  }));
}
