import { crossAt } from './cross.js';
import { macd } from './macd.js';
import { ema, sma } from './moving-average.js';
import { rsi } from './rsi.js';

const round = (s: (number | null)[], d = 4) =>
  s.map((v) => (v === null ? null : Number(v.toFixed(d))));

describe('sma', () => {
  it('averages a rolling window', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe('ema', () => {
  it('seeds with the SMA and smooths with k = 2/(n+1)', () => {
    // k = 0.5; seed = (1+2+3)/3 = 2; then 4*0.5+2*0.5 = 3; 5*0.5+3*0.5 = 4
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(round(ema([2, 4, 6, 8, 12], 3))).toEqual([null, null, 4, 6, 9]);
  });

  it('returns all nulls when there is not enough data', () => {
    expect(ema([1, 2], 3)).toEqual([null, null]);
  });
});

describe('rsi', () => {
  it('is 100 for a strictly rising series and 0 for a falling one', () => {
    const up = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(up, 14).at(-1)).toBe(100);
    expect(rsi([...up].reverse(), 14).at(-1)).toBe(0);
  });

  it('matches a reference value (Wilder, period 14)', () => {
    // Classic example from Wilder / StockCharts.
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64,
    ];
    const values = rsi(closes, 14);
    expect(values[13]).toBeNull();
    expect(values[14]).toBeCloseTo(70.46, 1);
    expect(values[19]).toBeCloseTo(57.92, 0);
  });
});

describe('macd', () => {
  it('produces aligned macd/signal/histogram series', () => {
    const closes = Array.from(
      { length: 60 },
      (_, i) => 100 + Math.sin(i / 4) * 5,
    );
    const { macd: line, signal, histogram } = macd(closes, 12, 26, 9);
    expect(line[24]).toBeNull();
    expect(line[25]).not.toBeNull();
    expect(signal[32]).toBeNull();
    expect(signal[33]).not.toBeNull();
    expect(histogram[59]).toBeCloseTo(line[59]! - signal[59]!, 10);
  });
});

describe('crossAt', () => {
  it('detects crosses on the last element', () => {
    expect(crossAt([1, 3], [2, 2])).toBe('above');
    expect(crossAt([3, 1], [2, 2])).toBe('below');
    expect(crossAt([3, 4], [2, 2])).toBeNull();
    expect(crossAt([null, 4], [2, 2])).toBeNull();
  });
});
