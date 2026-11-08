export function seededRandom(seed: number, day: number, stockId: string, stream: string) {
  let state = 2166136261;
  for (const char of `${seed}:${day}:${stockId}:${stream}`) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  // Mulberry32; each stock and noise source owns a separate deterministic stream.
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
