interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    start_param?: string;
  };
  ready(): void;
  expand(): void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
