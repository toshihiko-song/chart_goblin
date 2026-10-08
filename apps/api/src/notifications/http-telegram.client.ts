import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from '../common/http.js';
import type { Env } from '../config/env.js';
import { TelegramClient } from './telegram.client.js';

@Injectable()
export class HttpTelegramClient extends TelegramClient {
  private readonly token?: string;
  private readonly chatId?: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.token = config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    this.chatId = config.get('TELEGRAM_CHAT_ID', { infer: true });
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.chatId);
  }

  async sendMessage(html: string): Promise<void> {
    if (!this.isConfigured()) throw new Error('Telegram is not configured');
    await fetchJson(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: html,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      },
      retries: 2,
    });
  }
}
