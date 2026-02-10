import { useState, useCallback } from 'react';

export function useToast(duration = 2000) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  }, [duration]);

  return { toastMessage, showToast };
}
