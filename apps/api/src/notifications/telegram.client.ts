/** Abstraction over the Telegram Bot API. */
export abstract class TelegramClient {
  /** True when a bot token and chat id are configured. */
  abstract isConfigured(): boolean;
  /** Sends an HTML-formatted message to the configured chat. */
  abstract sendMessage(html: string): Promise<void>;
}
