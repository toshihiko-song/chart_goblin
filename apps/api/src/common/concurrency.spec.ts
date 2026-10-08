import { mapWithConcurrency } from './concurrency.js';

describe('mapWithConcurrency', () => {
  it('keeps order, respects the limit and captures failures', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      if (n === 3) throw new Error('boom');
      return n * 10;
    });

    expect(maxInFlight).toBe(2);
    expect(results.map((r) => r.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
    expect(results[4]).toEqual({ status: 'fulfilled', value: 50 });
  });
});
