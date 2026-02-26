import type { RandomSource } from "./types.js";

export class DefaultRandomSource implements RandomSource {
  nextDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }
}

export class SeededRandomSource implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextDie(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    const normalized = Math.abs(this.state % 6) + 1;
    return normalized;
  }
}
