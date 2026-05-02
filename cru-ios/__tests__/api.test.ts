import { buildQuery } from '../lib/api';

describe('buildQuery', () => {
  it('returns empty string for no params', () => {
    expect(buildQuery({})).toBe('');
  });
  it('filters out undefined and null', () => {
    expect(buildQuery({ a: 'x', b: undefined, c: null })).toBe('?a=x');
  });
  it('serialises multiple params', () => {
    const result = buildQuery({ page: 1, per_page: 20 });
    expect(result).toContain('page=1');
    expect(result).toContain('per_page=20');
  });
  it('filters empty strings', () => {
    expect(buildQuery({ q: '' })).toBe('');
  });
});
