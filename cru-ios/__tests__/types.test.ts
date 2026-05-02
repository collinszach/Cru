import { normalizeScore } from '../types';

describe('normalizeScore', () => {
  it('maps 100pt midpoint (75) to 0.5', () => {
    expect(normalizeScore(75, '100pt')).toBeCloseTo(0.5);
  });
  it('maps 20pt midpoint (15) to 0.5', () => {
    expect(normalizeScore(15, '20pt')).toBeCloseTo(0.5);
  });
  it('maps 5star midpoint (3) to 0.5', () => {
    expect(normalizeScore(3, '5star')).toBeCloseTo(0.5);
  });
  it('clamps 100pt score of 100 to 1.0', () => {
    expect(normalizeScore(100, '100pt')).toBe(1.0);
  });
  it('clamps 100pt score below 50 to 0', () => {
    expect(normalizeScore(40, '100pt')).toBe(0);
  });
});
