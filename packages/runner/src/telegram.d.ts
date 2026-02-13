interface Window {
  Telegram?: {
    WebApp?: {
      initData: string;
      initDataUnsafe: {
        user?: { id: number; first_name: string; last_name?: string; username?: string };
        start_param?: string;
      };
      ready(): void;
      expand(): void;
      openLink(url: string, options?: { try_instant_view?: boolean }): void;
    };
  };
}
