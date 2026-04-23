import { getTelegramConfig } from './env';

export async function sendTelegramMessage(text: string): Promise<void> {
  const cfg = getTelegramConfig();

  if (!cfg) {
    console.warn('Telegram not configured, skipping message');
    return;
  }

  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: cfg.chatId, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram API error ${response.status}: ${body}`);
  }
}
