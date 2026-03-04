/**
 * Telegram-safe confirm dialog.
 * Uses Telegram WebApp's showConfirm when available (window.confirm is broken there),
 * falls back to window.confirm for regular browsers.
 */
export function asyncConfirm(message: string): Promise<boolean> {
  const tg = window.Telegram?.WebApp;
  if (tg?.showConfirm) {
    return new Promise(resolve => tg.showConfirm(message, resolve));
  }
  return Promise.resolve(window.confirm(message));
}
