import type { StandingsEntry } from '@padel/common';
import type { Nomination } from '../hooks/useNominations';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** Read current theme colors from CSS variables on <html> */
function getThemeColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    bg:            v('--color-bg')             || '#0f0f1a',
    surface:       v('--color-surface')        || '#1a1a2e',
    surfaceRaised: v('--color-surface-raised') || '#22223a',
    border:        v('--color-border')         || '#2a2a44',
    text:          v('--color-text')           || '#f0f0f0',
    textSecondary: v('--color-text-secondary') || '#a0a0b8',
    textMuted:     v('--color-text-muted')     || '#6b6b80',
    primary:       v('--color-primary')        || '#e94560',
    accent:        v('--color-accent')         || '#16c79a',
    success:       v('--color-success')        || '#16c79a',
    danger:        v('--color-danger')         || '#e94560',
    rankGold:      v('--color-rank-gold')      || '#ffd700',
    rankSilver:    v('--color-rank-silver')    || '#c0c0c0',
    rankBronze:    v('--color-rank-bronze')    || '#cd7f32',
  };
}

const SCALE = 2; // retina

function s(px: number): number {
  return px * SCALE;
}

export function renderStandingsImage(
  tournamentName: string,
  standings: StandingsEntry[],
): HTMLCanvasElement {
  const t = getThemeColors();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Layout constants
  const padding = s(20);
  const headerHeight = s(36);
  const tableHeaderHeight = s(32);
  const rowHeight = s(36);
  const canvasWidth = s(400);

  const tableRows = standings.length;
  const tableHeight = tableHeaderHeight + rowHeight * tableRows;
  const footerHeight = s(28);
  const canvasHeight = padding + headerHeight + s(12) + tableHeight + s(16) + footerHeight + padding;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Background
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header
  let y = padding;
  ctx.fillStyle = t.text;
  ctx.font = `bold ${s(18)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(tournamentName, canvasWidth / 2, y + s(24));
  y += headerHeight;

  // Table card background
  const tableX = padding;
  const tableW = canvasWidth - padding * 2;
  const tableY = y;
  const cardRadius = s(8);

  ctx.fillStyle = t.surface;
  roundRect(ctx, tableX, tableY, tableW, tableHeight + s(8), cardRadius);
  ctx.fill();

  ctx.strokeStyle = t.border;
  ctx.lineWidth = s(1);
  roundRect(ctx, tableX, tableY, tableW, tableHeight + s(8), cardRadius);
  ctx.stroke();

  // Column positions (relative to tableX)
  const colRank = s(12);
  const colName = s(40);
  const colPts = tableW - s(100);
  const colWtl = tableW - s(56);
  const colDiff = tableW - s(14);

  // Table header
  y = tableY + s(4);
  ctx.textAlign = 'left';
  ctx.font = `600 ${s(9)}px ${FONT}`;
  ctx.fillStyle = t.textMuted;
  const headerY = y + s(20);
  ctx.fillText('#', tableX + colRank, headerY);
  ctx.fillText('PLAYER', tableX + colName, headerY);
  ctx.textAlign = 'right';
  ctx.fillText('PTS', tableX + colPts, headerY);
  ctx.textAlign = 'center';
  ctx.fillText('W-T-L', tableX + colWtl, headerY);
  ctx.textAlign = 'right';
  ctx.fillText('+/-', tableX + colDiff, headerY);

  // Header separator
  y += tableHeaderHeight;
  ctx.strokeStyle = t.border;
  ctx.lineWidth = s(1);
  ctx.beginPath();
  ctx.moveTo(tableX + s(8), y);
  ctx.lineTo(tableX + tableW - s(8), y);
  ctx.stroke();

  // Table rows
  const bodyFont = `${s(12)}px ${FONT}`;
  const boldFont = `bold ${s(12)}px ${FONT}`;
  const nameMaxWidth = colPts - colName - s(8);

  for (let i = 0; i < standings.length; i++) {
    const entry = standings[i];
    const rowY = y + rowHeight * i;
    const textY = rowY + s(24);

    // Row separator (skip first)
    if (i > 0) {
      ctx.strokeStyle = t.border;
      ctx.lineWidth = s(0.5);
      ctx.beginPath();
      ctx.moveTo(tableX + s(8), rowY);
      ctx.lineTo(tableX + tableW - s(8), rowY);
      ctx.stroke();
    }

    // Rank
    ctx.textAlign = 'left';
    ctx.font = boldFont;
    ctx.fillStyle =
      entry.rank === 1 ? t.rankGold
        : entry.rank === 2 ? t.rankSilver
        : entry.rank === 3 ? t.rankBronze
        : t.textMuted;
    ctx.fillText(String(entry.rank), tableX + colRank, textY);

    // Name (truncated if too long)
    ctx.font = `600 ${s(12)}px ${FONT}`;
    ctx.fillStyle = t.text;
    const displayName = truncateText(ctx, entry.playerName, nameMaxWidth);
    ctx.fillText(displayName, tableX + colName, textY);

    // Points
    ctx.textAlign = 'right';
    ctx.font = boldFont;
    ctx.fillStyle = t.primary;
    ctx.fillText(String(entry.totalPoints), tableX + colPts, textY);

    // W-T-L
    ctx.font = bodyFont;
    ctx.fillStyle = t.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText(`${entry.matchesWon}-${entry.matchesDraw}-${entry.matchesLost}`, tableX + colWtl, textY);

    // +/-
    ctx.textAlign = 'right';
    const diffStr = (entry.pointDiff > 0 ? '+' : '') + entry.pointDiff;
    ctx.fillStyle =
      entry.pointDiff > 0 ? t.success : entry.pointDiff < 0 ? t.danger : t.textSecondary;
    ctx.font = bodyFont;
    ctx.fillText(diffStr, tableX + colDiff, textY);
  }

  // Footer / watermark
  const footerY = tableY + tableHeight + s(8) + s(16);
  ctx.textAlign = 'center';
  ctx.font = `${s(9)}px ${FONT}`;
  ctx.fillStyle = t.textMuted;
  ctx.fillText(window.location.hostname, canvasWidth / 2, footerY + s(12));

  return canvas;
}

export function renderNominationImage(
  tournamentName: string,
  nomination: Nomination,
): HTMLCanvasElement {
  const t = getThemeColors();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const canvasWidth = s(400);
  const cx = canvasWidth / 2;
  const maxTextW = canvasWidth - s(48);
  const isMultiPlayer = nomination.playerNames.length > 2;

  // Matching CSS: gap var(--space-xs)=4px, padding var(--space-xl)=32px var(--space-lg)=24px
  const gap = s(4);
  const padV = s(32);
  const headerH = s(14);    // tournament name line
  const headerGap = s(12);
  const emojiH = s(44);     // 2.5rem = 40px + margin
  const titleH = s(16);     // --text-xs: 0.75rem = 12px + line-height
  const statH = s(22);      // --text-lg: 1.125rem = 18px + line-height
  const descH = s(18);      // --text-sm: 0.875rem = 14px + line-height
  const footerGap = s(12);
  const footerH = s(14);

  // Calculate player names height
  let playersH: number;
  if (isMultiPlayer) {
    playersH = s(24) + s(16) + s(24); // pair1 + vs + pair2
  } else {
    playersH = s(26); // --text-xl: 1.25rem = 20px + line-height
  }

  const contentH = emojiH + gap + titleH + gap + playersH + gap + statH + gap + descH;
  const canvasHeight = padV + headerH + headerGap + contentH + footerGap + footerH + padV;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const cardR = s(16);

  // Card gradient background matching CSS: linear-gradient(145deg, surface, surfaceRaised)
  const grad = ctx.createLinearGradient(0, 0, canvasWidth * 0.7, canvasHeight * 0.7);
  grad.addColorStop(0, t.surface);
  grad.addColorStop(1, t.surfaceRaised);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cardR);
  ctx.fill();

  // Card border
  ctx.strokeStyle = t.border;
  ctx.lineWidth = s(1);
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, cardR);
  ctx.stroke();

  ctx.textAlign = 'center';
  let y = padV;

  // Tournament name (small, top)
  ctx.fillStyle = t.textMuted;
  ctx.font = `600 ${s(9)}px ${FONT}`;
  ctx.fillText(tournamentName.toUpperCase(), cx, y + s(10));
  y += headerH + headerGap;

  // Emoji — matching CSS: font-size 2.5rem
  ctx.font = `${s(40)}px ${FONT}`;
  ctx.fillText(nomination.emoji, cx, y + s(36));
  y += emojiH + gap;

  // Title — matching CSS: --text-xs (12px), bold, uppercase, letter-spacing, accent color
  ctx.fillStyle = t.accent;
  ctx.font = `bold ${s(12)}px ${FONT}`;
  ctx.fillText(nomination.title.toUpperCase(), cx, y + s(12));
  y += titleH + gap;

  // Player names — matching CSS: --text-xl (20px), bold
  ctx.fillStyle = t.text;

  if (isMultiPlayer) {
    ctx.font = `bold ${s(16)}px ${FONT}`;
    const pair1 = `${nomination.playerNames[0]} & ${nomination.playerNames[1]}`;
    const pair2 = `${nomination.playerNames[2]} & ${nomination.playerNames[3]}`;
    ctx.fillText(truncateText(ctx, pair1, maxTextW), cx, y + s(16));
    y += s(24);
    // VS — matching CSS: --text-xs (12px), muted, uppercase
    ctx.fillStyle = t.textMuted;
    ctx.font = `${s(12)}px ${FONT}`;
    ctx.fillText('VS', cx, y + s(10));
    y += s(16);
    ctx.fillStyle = t.text;
    ctx.font = `bold ${s(16)}px ${FONT}`;
    ctx.fillText(truncateText(ctx, pair2, maxTextW), cx, y + s(16));
    y += s(24) + gap;
  } else {
    const nameText = nomination.playerNames.join(' & ');
    ctx.font = `bold ${s(20)}px ${FONT}`;
    const nameWidth = ctx.measureText(nameText).width;
    if (nameWidth > maxTextW) {
      ctx.font = `bold ${s(16)}px ${FONT}`;
    }
    ctx.fillText(truncateText(ctx, nameText, maxTextW), cx, y + s(18));
    y += playersH + gap;
  }

  // Stat — matching CSS: --text-lg (18px), bold, primary
  ctx.fillStyle = t.primary;
  ctx.font = `bold ${s(18)}px ${FONT}`;
  ctx.fillText(nomination.stat, cx, y + s(16));
  y += statH + gap;

  // Description — matching CSS: --text-sm (14px), muted
  ctx.fillStyle = t.textMuted;
  ctx.font = `${s(14)}px ${FONT}`;
  ctx.fillText(nomination.description, cx, y + s(12));

  // Footer / watermark
  ctx.fillStyle = t.textMuted;
  ctx.font = `${s(8)}px ${FONT}`;
  ctx.fillText(window.location.hostname, cx, canvasHeight - padV + s(16));

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export type ShareImageResult =
  | { status: 'shared' }
  | { status: 'downloaded' }
  | { status: 'failed' }
  | { status: 'preview'; dataUrls: string[] };

export async function shareStandingsImage(
  tournamentName: string,
  standings: StandingsEntry[],
  nominations: Nomination[] = [],
): Promise<ShareImageResult> {
  let standingsCanvas: HTMLCanvasElement;
  let nominationCanvases: HTMLCanvasElement[];

  try {
    standingsCanvas = renderStandingsImage(tournamentName, standings);
    nominationCanvases = nominations.map(n => renderNominationImage(tournamentName, n));
  } catch {
    return { status: 'failed' };
  }

  const safeName = tournamentName.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    // Convert all to blobs
    const standingsBlob = await canvasToBlob(standingsCanvas);
    if (!standingsBlob) return { status: 'failed' };

    const files: File[] = [
      new File([standingsBlob], `${safeName}_results.png`, { type: 'image/png' }),
    ];

    for (let i = 0; i < nominationCanvases.length; i++) {
      const blob = await canvasToBlob(nominationCanvases[i]);
      if (blob) {
        const nom = nominations[i];
        const nomName = nom.id.replace(/[^a-zA-Z0-9-]/g, '_');
        files.push(new File([blob], `${safeName}_${nomName}.png`, { type: 'image/png' }));
      }
    }

    const tg = window.Telegram?.WebApp;

    // Telegram WebApp must be checked FIRST: its WebView exposes navigator.share
    // but it doesn't actually work (resolves without sharing). Blob downloads and
    // programmatic <a>.click() are also blocked.
    if (tg) {
      // Try Telegram's native downloadFile API (Bot API 8.0+) for the standings image
      if (typeof tg.downloadFile === 'function') {
        try {
          const dataUrl = standingsCanvas.toDataURL('image/png');
          await tg.downloadFile({ url: dataUrl, file_name: `${safeName}_results.png` });
          return { status: 'downloaded' };
        } catch {
          // downloadFile not supported or failed — fall through to preview
        }
      }
      // Fallback: show preview overlay so users can long-press to save
      const allCanvases = [standingsCanvas, ...nominationCanvases];
      const dataUrls = allCanvases.map(c => c.toDataURL('image/png'));
      return { status: 'preview', dataUrls };
    }

    // Try Web Share API (works on mobile browsers and some desktops)
    if (navigator.share) {
      const shareData = { files };
      // canShare may not exist in all environments; skip the check if absent
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

    // Fallback: download all files via <a> click
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revocation so the browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    return { status: 'downloaded' };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { status: 'failed' };

    // Last resort for Telegram: show preview overlay
    if (window.Telegram?.WebApp) {
      try {
        const allCanvases = [standingsCanvas, ...nominationCanvases];
        const dataUrls = allCanvases.map(c => c.toDataURL('image/png'));
        return { status: 'preview', dataUrls };
      } catch {
        // give up
      }
    }

    return { status: 'failed' };
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
