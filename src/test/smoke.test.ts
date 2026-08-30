import { describe, it, expect } from 'vitest';

// Smoke test to confirm the Vitest + jsdom tooling runs.
// This can be removed once real tests exist.
describe('tooling smoke test', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });

  it('has a jsdom environment', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });
});
