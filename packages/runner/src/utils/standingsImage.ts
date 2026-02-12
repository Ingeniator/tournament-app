import type { StandingsEntry } from '@padel/common';

// Theme matching runner variables.css
const BG = '#0f0f1a';
const SURFACE = '#1a1a2e';
const BORDER = '#2a2a44';
const TEXT = '#f0f0f0';
const TEXT_SECONDARY = '#a0a0b8';
const TEXT_MUTED = '#6b6b80';
const PRIMARY = '#e94560';
const SUCCESS = '#16c79a';
const DANGER = '#e94560';

const RANK_GOLD = '#ffd700';
const RANK_SILVER = '#c0c0c0';
const RANK_BRONZE = '#cd7f32';

const SCALE = 2; // retina

function s(px: number): number {
  return px * SCALE;
}

export function renderStandingsImage(
  tournamentName: string,
  standings: StandingsEntry[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Layout constants
  const padding = s(20);
  const headerHeight = s(56);
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
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header
  let y = padding;
  ctx.fillStyle = SUCCESS;
  ctx.font = `bold ${s(11)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('TOURNAMENT COMPLETE', canvasWidth / 2, y + s(14));

  ctx.fillStyle = TEXT;
  ctx.font = `bold ${s(18)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(tournamentName, canvasWidth / 2, y + s(40));
  y += headerHeight;

  // Table card background
  const tableX = padding;
  const tableW = canvasWidth - padding * 2;
  const tableY = y;
  const cardRadius = s(8);

  ctx.fillStyle = SURFACE;
  roundRect(ctx, tableX, tableY, tableW, tableHeight + s(8), cardRadius);
  ctx.fill();

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = s(1);
  roundRect(ctx, tableX, tableY, tableW, tableHeight + s(8), cardRadius);
  ctx.stroke();

  // Column positions (relative to tableX)
  const colRank = s(12);
  const colName = s(40);
  const colPts = tableW - s(120);
  const colW = tableW - s(84);
  const colL = tableW - s(52);
  const colDiff = tableW - s(14);

  // Table header
  y = tableY + s(4);
  ctx.textAlign = 'left';
  ctx.font = `600 ${s(9)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = TEXT_MUTED;
  const headerY = y + s(20);
  ctx.fillText('#', tableX + colRank, headerY);
  ctx.fillText('PLAYER', tableX + colName, headerY);
  ctx.textAlign = 'right';
  ctx.fillText('PTS', tableX + colPts, headerY);
  ctx.fillText('W', tableX + colW, headerY);
  ctx.fillText('L', tableX + colL, headerY);
  ctx.fillText('+/-', tableX + colDiff, headerY);

  // Header separator
  y += tableHeaderHeight;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = s(1);
  ctx.beginPath();
  ctx.moveTo(tableX + s(8), y);
  ctx.lineTo(tableX + tableW - s(8), y);
  ctx.stroke();

  // Table rows
  const bodyFont = `${s(12)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const boldFont = `bold ${s(12)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const nameMaxWidth = colPts - colName - s(8);

  for (let i = 0; i < standings.length; i++) {
    const entry = standings[i];
    const rowY = y + rowHeight * i;
    const textY = rowY + s(24);

    // Row separator (skip first)
    if (i > 0) {
      ctx.strokeStyle = BORDER;
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
      entry.rank === 1 ? RANK_GOLD
        : entry.rank === 2 ? RANK_SILVER
        : entry.rank === 3 ? RANK_BRONZE
        : TEXT_MUTED;
    ctx.fillText(String(entry.rank), tableX + colRank, textY);

    // Name (truncated if too long)
    ctx.font = `600 ${s(12)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = TEXT;
    const displayName = truncateText(ctx, entry.playerName, nameMaxWidth);
    ctx.fillText(displayName, tableX + colName, textY);

    // Points
    ctx.textAlign = 'right';
    ctx.font = boldFont;
    ctx.fillStyle = PRIMARY;
    ctx.fillText(String(entry.totalPoints), tableX + colPts, textY);

    // W
    ctx.font = bodyFont;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(String(entry.matchesWon), tableX + colW, textY);

    // L
    ctx.fillText(String(entry.matchesLost), tableX + colL, textY);

    // +/-
    const diffStr = (entry.pointDiff > 0 ? '+' : '') + entry.pointDiff;
    ctx.fillStyle =
      entry.pointDiff > 0 ? SUCCESS : entry.pointDiff < 0 ? DANGER : TEXT_SECONDARY;
    ctx.font = bodyFont;
    ctx.fillText(diffStr, tableX + colDiff, textY);
  }

  // Footer / watermark
  const footerY = tableY + tableHeight + s(8) + s(16);
  ctx.textAlign = 'center';
  ctx.font = `${s(9)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText(window.location.hostname, canvasWidth / 2, footerY + s(12));

  return canvas;
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

export async function shareStandingsImage(
  tournamentName: string,
  standings: StandingsEntry[],
): Promise<'shared' | 'downloaded' | 'failed'> {
  const canvas = renderStandingsImage(tournamentName, standings);

  try {
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) return 'failed';

    const fileName = `${tournamentName.replace(/[^a-zA-Z0-9]/g, '_')}_results.png`;

    // Try Web Share API (mobile)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      const shareData = { files: [file] };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return 'shared';
      }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch (e) {
    // User cancelled share dialog
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed';
    return 'failed';
  }
}
