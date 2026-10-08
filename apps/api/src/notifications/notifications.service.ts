import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TIMEFRAME_MS, type GeneralSettings } from '@chart-goblin/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toSignalDto,
  type SignalWithRelations,
} from '../signals/signal.mapper.js';
import { formatAlert } from './alert-message.js';
import { TelegramClient } from './telegram.client.js';

export type AlertDecision =
  | 'sent'
  | 'failed'
  | 'below-threshold'
  | 'disabled'
  | 'already-sent'
  | 'cooldown';

const CHANNEL = 'telegram';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramClient,
  ) {}

  /**
   * Sends a Telegram alert for a strong signal unless it was already alerted or
   * the same coin/timeframe/direction was alerted within the cooldown window.
   */
  async maybeAlert(
    signal: SignalWithRelations,
    settings: GeneralSettings,
  ): Promise<AlertDecision> {
    if (signal.score < settings.minAlertScore) return 'below-threshold';
    if (!settings.telegramEnabled || !this.telegram.isConfigured())
      return 'disabled';
    if (signal.alert?.status === 'sent') return 'already-sent';

    const cooldownMs =
      settings.alertCooldownCandles *
      TIMEFRAME_MS[signal.timeframe as keyof typeof TIMEFRAME_MS];
    const recent = await this.prisma.alert.findFirst({
      where: {
        status: 'sent',
        signal: {
          coinId: signal.coinId,
          timeframe: signal.timeframe,
          direction: signal.direction,
          candleOpenTime: {
            gte: new Date(signal.candleOpenTime.getTime() - cooldownMs),
            lt: signal.candleOpenTime,
          },
        },
      },
    });
    if (recent) return 'cooldown';

    let error: string | null = null;
    try {
      await this.telegram.sendMessage(formatAlert(toSignalDto(signal)));
    } catch (e) {
      error = (e as Error).message;
      this.logger.warn(
        `Telegram alert for signal ${signal.id} failed: ${error}`,
      );
    }

    const status = error ? 'failed' : 'sent';
    await this.prisma.alert.upsert({
      where: { signalId: signal.id },
      create: { signalId: signal.id, channel: CHANNEL, status, error },
      update: { status, error, sentAt: new Date() },
    });
    return status;
  }

  async sendTest(): Promise<void> {
    if (!this.telegram.isConfigured()) {
      throw new BadRequestException(
        'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in apps/api/.env',
      );
    }
    await this.telegram.sendMessage(
      '✅ <b>Chart Goblin</b> test alert. Telegram is set up.',
    );
  }

  isConfigured(): boolean {
    return this.telegram.isConfigured();
  }
}
