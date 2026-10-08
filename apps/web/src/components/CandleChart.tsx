import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  LineType,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import {
  macd,
  movingAverage,
  rsi,
  type CandleDto,
  type Series,
  type SignalDto,
} from '@chart-goblin/shared';
import {
  INDICATOR_COLORS,
  priorRange,
  priorVolumeAverage,
  type ChartIndicator,
} from '../lib/chart-indicators';

const toTime = (ms: number) => (ms / 1000) as UTCTimestamp;

const COLORS = {
  up: '#34d399',
  down: '#f87171',
  text: '#94a3b8',
  grid: '#1e293b',
  volumeUp: 'rgba(52,211,153,0.3)',
  volumeDown: 'rgba(248,113,113,0.3)',
  spikeUp: 'rgba(52,211,153,0.85)',
  spikeDown: 'rgba(248,113,113,0.85)',
};

const PRICE_PANE_HEIGHT = 420;
const SUB_PANE_HEIGHT = 140;

const LINE_DEFAULTS = {
  lineWidth: 1,
  priceLineVisible: false,
  lastValueVisible: false,
  crosshairMarkerVisible: false,
} as const;

/** Indicators drawn in their own pane below the price chart. */
const hasOwnPane = (i: ChartIndicator) => i.kind === 'macd' || i.kind === 'rsi';

function toLineData(candles: CandleDto[], values: Series) {
  return candles.flatMap((k, i) =>
    values[i] === null ? [] : [{ time: toTime(k.openTime), value: values[i] }],
  );
}

/**
 * Candlesticks + volume, the indicators of the enabled strategies (price
 * overlays and MACD/RSI panes) and markers for detected signals.
 */
export function CandleChart({
  candles,
  indicators,
  signals,
}: {
  candles: CandleDto[];
  indicators: ChartIndicator[];
  signals: SignalDto[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markers = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const indicatorSeries = useRef<ISeriesApi<SeriesType>[]>([]);

  // Create the chart once.
  useEffect(() => {
    const c = createChart(container.current!, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: COLORS.text,
        attributionLogo: false,
        panes: { separatorColor: COLORS.grid },
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      timeScale: { timeVisible: true, borderColor: COLORS.grid },
      rightPriceScale: { borderColor: COLORS.grid },
    });
    candleSeries.current = c.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderVisible: false,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });
    volumeSeries.current = c.addSeries(HistogramSeries, {
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.current
      .priceScale()
      .applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    markers.current = createSeriesMarkers(candleSeries.current, []);
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
      indicatorSeries.current = [];
    };
  }, []);

  // Candles, volume and indicators. Indicators are rebuilt from scratch on
  // every change; it's cheap and keeps pane bookkeeping simple.
  useEffect(() => {
    const c = chart.current;
    if (!c) return;

    candleSeries.current?.setData(
      candles.map((k) => ({
        time: toTime(k.openTime),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      })),
    );

    const volume = indicators.find((i) => i.kind === 'volume');
    const volumeAvg = volume
      ? priorVolumeAverage(candles, volume.lookback)
      : null;
    volumeSeries.current?.setData(
      candles.map((k, i) => {
        const up = k.close >= k.open;
        const spike =
          volume &&
          volumeAvg?.[i] != null &&
          k.volume >= volumeAvg[i]! * volume.multiplier;
        return {
          time: toTime(k.openTime),
          value: k.volume,
          color: spike
            ? up
              ? COLORS.spikeUp
              : COLORS.spikeDown
            : up
              ? COLORS.volumeUp
              : COLORS.volumeDown,
        };
      }),
    );

    indicatorSeries.current.forEach((s) => c.removeSeries(s));
    indicatorSeries.current = [];
    while (c.panes().length > 1) c.removePane(c.panes().length - 1);

    const add = <T extends SeriesType>(series: ISeriesApi<T>) => {
      indicatorSeries.current.push(series as ISeriesApi<SeriesType>);
      return series;
    };
    const closes = candles.map((k) => k.close);
    let nextPane = 1;

    for (const indicator of indicators) {
      switch (indicator.kind) {
        case 'ma':
          for (const line of indicator.lines) {
            add(
              c.addSeries(LineSeries, {
                ...LINE_DEFAULTS,
                color: line.color,
                title: `${line.type}${line.period}`,
              }),
            ).setData(
              toLineData(
                candles,
                movingAverage(line.type, closes, line.period),
              ),
            );
          }
          break;

        case 'range': {
          const range = priorRange(candles, indicator.lookback);
          for (const [values, title] of [
            [range.high, `High ${indicator.lookback}`],
            [range.low, `Low ${indicator.lookback}`],
          ] as const) {
            add(
              c.addSeries(LineSeries, {
                ...LINE_DEFAULTS,
                color: INDICATOR_COLORS.range,
                lineStyle: LineStyle.Dashed,
                lineType: LineType.WithSteps,
                title,
              }),
            ).setData(toLineData(candles, values));
          }
          break;
        }

        case 'volume':
          // Shares the volume histogram's overlay scale.
          add(
            c.addSeries(LineSeries, {
              ...LINE_DEFAULTS,
              priceScaleId: '',
              color: INDICATOR_COLORS.volumeAvg,
            }),
          ).setData(toLineData(candles, volumeAvg!));
          break;

        case 'macd': {
          const pane = nextPane++;
          const result = macd(
            closes,
            indicator.fast,
            indicator.slow,
            indicator.signal,
          );
          add(
            c.addSeries(
              HistogramSeries,
              { priceLineVisible: false, lastValueVisible: false },
              pane,
            ),
          ).setData(
            candles.flatMap((k, i) => {
              const h = result.histogram[i];
              return h === null
                ? []
                : [
                    {
                      time: toTime(k.openTime),
                      value: h,
                      color: h >= 0 ? COLORS.volumeUp : COLORS.volumeDown,
                    },
                  ];
            }),
          );
          add(
            c.addSeries(
              LineSeries,
              { ...LINE_DEFAULTS, color: INDICATOR_COLORS.macd, title: 'MACD' },
              pane,
            ),
          ).setData(toLineData(candles, result.macd));
          add(
            c.addSeries(
              LineSeries,
              {
                ...LINE_DEFAULTS,
                color: INDICATOR_COLORS.macdSignal,
                title: 'Signal',
              },
              pane,
            ),
          ).setData(toLineData(candles, result.signal));
          break;
        }

        case 'rsi': {
          const pane = nextPane++;
          const series = add(
            c.addSeries(
              LineSeries,
              {
                ...LINE_DEFAULTS,
                lastValueVisible: true,
                color: INDICATOR_COLORS.rsi,
                title: `RSI ${indicator.period}`,
                autoscaleInfoProvider: () => ({
                  priceRange: { minValue: 0, maxValue: 100 },
                }),
              },
              pane,
            ),
          );
          series.setData(toLineData(candles, rsi(closes, indicator.period)));
          for (const level of [indicator.oversold, indicator.overbought]) {
            series.createPriceLine({
              price: level,
              color: COLORS.text,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: '',
            });
          }
          break;
        }
      }
    }

    // Proportional sizing; the container grows by SUB_PANE_HEIGHT per pane.
    c.panes().forEach((pane, i) =>
      pane.setStretchFactor(i === 0 ? PRICE_PANE_HEIGHT : SUB_PANE_HEIGHT),
    );
  }, [candles, indicators]);

  // Signal markers on the candles they were detected on.
  useEffect(() => {
    const first = candles[0]?.openTime ?? Infinity;
    const list: SeriesMarker<Time>[] = signals
      .map((s) => ({ s, t: new Date(s.candleOpenTime).getTime() }))
      .filter(({ t }) => t >= first)
      .sort((a, b) => a.t - b.t)
      .map(({ s, t }) => {
        const bullish = s.direction === 'bullish';
        return {
          time: toTime(t),
          position: bullish ? 'belowBar' : 'aboveBar',
          color: bullish ? COLORS.up : COLORS.down,
          shape: bullish ? 'arrowUp' : 'arrowDown',
          text: String(s.score),
        } as const;
      });
    markers.current?.setMarkers(list);
  }, [signals, candles]);

  const subPanes = indicators.filter(hasOwnPane).length;
  return (
    <div
      ref={container}
      className="w-full"
      style={{ height: PRICE_PANE_HEIGHT + subPanes * SUB_PANE_HEIGHT }}
    />
  );
}
