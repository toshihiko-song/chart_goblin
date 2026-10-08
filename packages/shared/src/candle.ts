/** An OHLCV candle. `openTime` is a UTC epoch in milliseconds. */
export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
