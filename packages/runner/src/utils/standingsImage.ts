import { toBlob } from 'html-to-image';

export type ShareImageResult =
  | { status: 'shared' }
  | { status: 'downloaded' }
  | { status: 'failed' }
  | { status: 'preview'; dataUrls: string[] };

export interface ShareableItem {
  element: HTMLElement;
  filename: string;
}

export async function shareStandingsImage(
  items: ShareableItem[],
): Promise<ShareImageResult> {
  if (items.length === 0) return { status: 'failed' };

  let blobs: (Blob | null)[];
  try {
    blobs = await Promise.all(
      items.map(item => toBlob(item.element, { pixelRatio: 2 })),
    );
  } catch {
    return { status: 'failed' };
  }

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const blob = blobs[i];
    if (blob) {
      files.push(new File([blob], items[i].filename, { type: 'image/png' }));
    }
  }

  if (files.length === 0) return { status: 'failed' };

  try {
    const tg = window.Telegram?.WebApp;
    const isTelegramBrowser = tg || /Telegram/i.test(navigator.userAgent);

    // Telegram in-app browser: navigator.share is absent or silently resolves
    // without sharing. Programmatic <a>.click() downloads are also blocked.
    // Show preview overlay so user can long-press to save images.
    if (isTelegramBrowser) {
      const blobUrls = blobs
        .filter((b): b is Blob => b !== null)
        .map(b => URL.createObjectURL(b));
      return { status: 'preview', dataUrls: blobUrls };
    }

    // Try Web Share API (works on mobile browsers and some desktops)
    if (navigator.share) {
      const shareData = { files };
      const canShare = !navigator.canShare || navigator.canShare(shareData);
      if (canShare) {
        try {
          await navigator.share(shareData);
          return { status: 'shared' };
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') {
            return { status: 'failed' };
          }
          // Share failed (e.g. files not supported) — fall through to fallbacks
        }
      }
    }

    // On mobile, programmatic <a>.click() downloads are unreliable/blocked.
    // Show preview overlay instead so user can long-press to save images.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const blobUrls = files.map(f => URL.createObjectURL(f));
      return { status: 'preview', dataUrls: blobUrls };
    }

    // Fallback: download all files via <a> click (desktop only)
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    return { status: 'downloaded' };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { status: 'failed' };
    return { status: 'failed' };
  }
}
