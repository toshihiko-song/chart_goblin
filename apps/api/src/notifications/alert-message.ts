import type { SignalDto } from '@chart-goblin/shared';

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function pairLabel(signal: Pick<SignalDto, 'coin'>): string {
  return `${signal.coin.symbol}/USDT`;
}

/** Telegram HTML message for a signal. */
export function formatAlert(signal: SignalDto): string {
  const icon = signal.direction === 'bullish' ? '🟢 Bullish' : '🔴 Bearish';
  const lines = [
    `🚨 <b>${escapeHtml(pairLabel(signal))}</b>  ${icon}`,
    '',
    `Score: <b>${signal.score}/100</b>`,
    `Timeframe: ${signal.timeframe.toUpperCase()}`,
    `Price: ${signal.price}`,
    '',
    ...signal.reasons.map(
      (r) => `✓ <b>${escapeHtml(r.name)}</b>: ${escapeHtml(r.reason)}`,
    ),
  ];
  return lines.join('\n');
}
