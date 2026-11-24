import { getMediaImage } from './mediaStorage';
import { SessionShareCardData } from './shareCard';

export type ShareCardTheme = 'dark' | 'light';

export interface RenderShareCardOptions {
  theme?: ShareCardTheme;
}

interface Palette {
  bg: string;
  cardBg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderLight: string;
  text: string;
  textMuted: string;
  textSubMuted: string;
  accent: string;
  accentSoft: string;
  gold: string;
  greenBg: string;
  greenText: string;
  greenBorder: string;
  redBg: string;
  redText: string;
  redBorder: string;
}

const PALETTES: Record<ShareCardTheme, Palette> = {
  dark: {
    bg: '#161311', // Deep Espresso
    cardBg: '#1D211B', // Dark Olive surface
    surface: '#272A24',
    surfaceAlt: '#32362E',
    border: 'rgba(250, 246, 238, 0.12)',
    borderLight: 'rgba(250, 246, 238, 0.22)',
    text: '#FAF6EE', // Warm Cream
    textMuted: '#A8A196',
    textSubMuted: '#7A746B',
    accent: '#E5734F', // Terracotta
    accentSoft: 'rgba(229, 115, 79, 0.18)',
    gold: '#F3C74D',
    greenBg: 'rgba(94, 158, 114, 0.20)',
    greenText: '#78C98F',
    greenBorder: 'rgba(94, 158, 114, 0.50)',
    redBg: 'rgba(217, 93, 93, 0.20)',
    redText: '#F08585',
    redBorder: 'rgba(217, 93, 93, 0.50)',
  },
  light: {
    bg: '#FAF6EE', // Warm Cream
    cardBg: '#FFFFFF',
    surface: '#F4EFE6',
    surfaceAlt: '#EBE4D8',
    border: 'rgba(22, 19, 17, 0.12)',
    borderLight: 'rgba(22, 19, 17, 0.24)',
    text: '#161311', // Deep Espresso
    textMuted: '#6E675E',
    textSubMuted: '#9E968A',
    accent: '#E5734F', // Terracotta
    accentSoft: 'rgba(229, 115, 79, 0.14)',
    gold: '#B8860B',
    greenBg: '#EAF5ED',
    greenText: '#2D7742',
    greenBorder: '#A3D4AF',
    redBg: '#FDF0F0',
    redText: '#B83232',
    redBorder: '#F1B2B2',
  },
};

/**
 * Safely loads an image without tainting the canvas or throwing SecurityError.
 * Reads idb:// references via mediaStorage, uses crossOrigin="anonymous" with 3.5s timeout.
 */
async function loadSafeImage(
  url?: string | null,
  timeoutMs = 3500
): Promise<HTMLImageElement | null> {
  if (!url) return null;
  try {
    let resolvedUrl = url;
    if (url.startsWith('idb://')) {
      const idbData = await getMediaImage(url);
      if (!idbData) return null;
      resolvedUrl = idbData;
    }

    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(null);
        }
      }, timeoutMs);

      if (!resolvedUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(null);
      };

      img.src = resolvedUrl;
    });
  } catch {
    return null;
  }
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // Truncate last line if more words remained
  if (lines.length === maxLines && words.length > lines.join(' ').split(' ').length) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}...`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}...`;
  }

  return lines;
}

function getMonogram(title: string): string {
  const clean = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'BG';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Renders the HTML5 Canvas 2D Session Share Card at 1080 × 1350 resolution.
 * Returns a high-res PNG Blob.
 */
export async function renderSessionShareCard(
  data: SessionShareCardData,
  options: RenderShareCardOptions = {}
): Promise<Blob> {
  const themeKey = options.theme || 'dark';
  const palette = PALETTES[themeKey];

  // Wait for document fonts to be ready for accurate typography
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font loading fails
    }
  }

  // Load cover image safely (timeout protected & crossOrigin)
  const coverImg = await loadSafeImage(data.coverUrl, 3500);

  const width = 1080;
  const height = 1350;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Typography fallbacks
  const fontSerif = '"Playfair Display", Georgia, "Times New Roman", serif';
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // 1. Draw outer background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw card container
  const cardX = 48;
  const cardY = 48;
  const cardW = width - 96;
  const cardH = height - 96;
  const cardR = 32;

  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // 3. Top Bar
  // Left: Brand
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 16px ${fontSans}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEO — BOARD GAME COLLECTION', cardX + 36, cardY + 44);

  // Right: Badges / Pills
  let pillRightX = cardX + cardW - 36;

  // Play #N pill
  ctx.font = `bold 16px ${fontSans}`;
  const playText = data.playIndexFormatted;
  const playMetrics = ctx.measureText(playText);
  const playPillW = playMetrics.width + 28;
  const playPillH = 34;
  const playPillX = pillRightX - playPillW;
  const playPillY = cardY + 44 - playPillH / 2;

  drawRoundRect(ctx, playPillX, playPillY, playPillW, playPillH, 17);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.fillText(playText, playPillX + playPillW / 2, cardY + 44);

  pillRightX = playPillX - 12;

  // NEW RECORD pill (if applicable)
  if (data.isNewRecord) {
    const recText = '★ NEW RECORD';
    const recMetrics = ctx.measureText(recText);
    const recPillW = recMetrics.width + 28;
    const recPillH = 34;
    const recPillX = pillRightX - recPillW;
    const recPillY = cardY + 44 - recPillH / 2;

    drawRoundRect(ctx, recPillX, recPillY, recPillW, recPillH, 17);
    ctx.fillStyle = palette.accent;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(recText, recPillX + recPillW / 2, cardY + 44);
  }

  // Top divider
  const divY1 = cardY + 76;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, divY1);
  ctx.lineTo(cardX + cardW - 36, divY1);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Hero Block
  const heroX = cardX + 36;
  const heroY = divY1 + 24;
  const coverSize = 190;
  const coverR = 18;

  if (coverImg) {
    ctx.save();
    drawRoundRect(ctx, heroX, heroY, coverSize, coverSize, coverR);
    ctx.clip();

    const scale = Math.max(coverSize / coverImg.naturalWidth, coverSize / coverImg.naturalHeight);
    const sw = coverSize / scale;
    const sh = coverSize / scale;
    const sx = (coverImg.naturalWidth - sw) / 2;
    const sy = (coverImg.naturalHeight - sh) / 2;
    ctx.drawImage(coverImg, sx, sy, sw, sh, heroX, heroY, coverSize, coverSize);
    ctx.restore();

    // Border around cover
    drawRoundRect(ctx, heroX, heroY, coverSize, coverSize, coverR);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.borderLight;
    ctx.stroke();
  } else {
    // Editorial Monogram Frame
    drawRoundRect(ctx, heroX, heroY, coverSize, coverSize, coverR);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    // Inner subtle box
    drawRoundRect(ctx, heroX + 8, heroY + 8, coverSize - 16, coverSize - 16, coverR - 6);
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    // Monogram letters
    ctx.fillStyle = palette.accent;
    ctx.font = `italic bold 52px ${fontSerif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getMonogram(data.gameTitle), heroX + coverSize / 2, heroY + coverSize / 2);
  }

  // Title and metadata to the right of cover
  const textX = heroX + coverSize + 32;
  const maxTitleW = cardW - 72 - coverSize - 32;

  ctx.fillStyle = palette.text;
  ctx.font = `bold 38px ${fontSerif}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const titleLines = wrapText(ctx, data.gameTitle, maxTitleW, 2);
  const lineH = 46;
  let currentY = heroY + 12;
  for (const line of titleLines) {
    ctx.fillText(line, textX, currentY);
    currentY += lineH;
  }

  // Metadata line
  currentY = Math.max(currentY + 6, heroY + coverSize - 44);
  const metaParts = [
    data.dateFormatted,
    data.locationName,
    data.durationFormatted,
    data.playerCountFormatted,
  ].filter(Boolean);

  ctx.fillStyle = palette.textMuted;
  ctx.font = `500 18px ${fontSans}`;
  ctx.textBaseline = 'top';
  ctx.fillText(metaParts.join('  ·  '), textX, currentY);

  // Hero divider
  const divY2 = heroY + coverSize + 28;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, divY2);
  ctx.lineTo(cardX + cardW - 36, divY2);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. Main Result Block
  const blockX = cardX + 36;
  const blockY = divY2 + 24;
  const blockW = cardW - 72;

  if (data.mode === 'points') {
    // Header
    ctx.fillStyle = palette.textSubMuted;
    ctx.font = `bold 14px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FINAL STANDINGS', blockX, blockY);

    const rowStartY = blockY + 30;
    const players = data.leaderboard || [];
    const maxRows = 8;
    const rowH = 68;
    const rowGap = 10;

    for (let i = 0; i < players.length && i < maxRows; i++) {
      const p = players[i];
      const rY = rowStartY + i * (rowH + rowGap);
      const isFirst = p.rank === 1;

      // Row background
      drawRoundRect(ctx, blockX, rY, blockW, rowH, 16);
      if (isFirst) {
        ctx.fillStyle = palette.accentSoft;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = palette.accent;
        ctx.stroke();
      } else {
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.border;
        ctx.stroke();
      }

      // Rank badge
      const badgeSize = 38;
      const badgeX = blockX + 16;
      const badgeY = rY + (rowH - badgeSize) / 2;
      drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
      ctx.fillStyle = isFirst ? palette.accent : palette.surfaceAlt;
      ctx.fill();

      ctx.fillStyle = isFirst ? '#FFFFFF' : palette.textMuted;
      ctx.font = `bold 16px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isFirst ? '👑' : `#${p.rank}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2);

      // Player name
      ctx.fillStyle = palette.text;
      ctx.font = `600 22px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const nameX = badgeX + badgeSize + 18;
      ctx.fillText(p.playerName, nameX, rY + rowH / 2);

      // Score
      ctx.textAlign = 'right';
      ctx.font = `bold 26px ${fontSans}`;
      ctx.fillStyle = isFirst ? palette.accent : palette.text;
      ctx.fillText(p.scoreFormatted, blockX + blockW - 64, rY + rowH / 2);

      // "pts" label
      ctx.font = `500 15px ${fontSans}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText('pts', blockX + blockW - 20, rY + rowH / 2 + 1);
    }

    if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
      const overflowY = rowStartY + players.length * (rowH + rowGap) + 12;
      ctx.fillStyle = palette.textMuted;
      ctx.font = `italic 16px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${data.overflowPlayerCount} more players`, blockX + blockW / 2, overflowY);
    }
  } else if (data.mode === 'win_only') {
    // WINNER / WINNERS Section
    const winners = data.winners || [];
    const isMultiWinner = winners.length > 1;
    const winnerHeader = isMultiWinner ? '👑 WINNERS' : '👑 WINNER';

    const winBoxH = isMultiWinner ? 180 : 150;
    drawRoundRect(ctx, blockX, blockY, blockW, winBoxH, 22);
    ctx.fillStyle = palette.accentSoft;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.accent;
    ctx.stroke();

    // Badge
    ctx.fillStyle = palette.accent;
    ctx.font = `bold 15px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(winnerHeader, blockX + 28, blockY + 22);

    // Winner Name(s)
    if (isMultiWinner) {
      const winnerNames = winners.map((w) => w.playerName).join('  ·  ');
      ctx.fillStyle = palette.text;
      ctx.font = `bold 32px ${fontSerif}`;
      ctx.textBaseline = 'middle';
      const winnerLines = wrapText(ctx, winnerNames, blockW - 56, 2);
      let wY = blockY + 70;
      for (const line of winnerLines) {
        ctx.fillText(line, blockX + 28, wY);
        wY += 38;
      }
    } else {
      const singleName = winners[0]?.playerName || 'Winner';
      ctx.fillStyle = palette.text;
      ctx.font = `bold 42px ${fontSerif}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(singleName, blockX + 28, blockY + winBoxH / 2 + 10);
    }

    // ALSO PLAYED Section
    const otherPlayers = data.otherPlayers || [];
    if (otherPlayers.length > 0) {
      const alsoY = blockY + winBoxH + 34;
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('ALSO PLAYED', blockX, alsoY);

      let pillX = blockX;
      let pillY = alsoY + 28;
      const pillGap = 12;
      const pillH = 46;

      ctx.font = `500 18px ${fontSans}`;
      for (const other of otherPlayers) {
        const textMetrics = ctx.measureText(other.playerName);
        const pW = textMetrics.width + 36;
        if (pillX + pW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }

        drawRoundRect(ctx, pillX, pillY, pW, pillH, 14);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.border;
        ctx.stroke();

        ctx.fillStyle = palette.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(other.playerName, pillX + pW / 2, pillY + pillH / 2);

        pillX += pW + pillGap;
      }

      if (data.overflowOtherCount && data.overflowOtherCount > 0) {
        const moreText = `+${data.overflowOtherCount} more`;
        const mMetrics = ctx.measureText(moreText);
        const mW = mMetrics.width + 32;
        if (pillX + mW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }
        drawRoundRect(ctx, pillX, pillY, mW, pillH, 14);
        ctx.fillStyle = palette.surfaceAlt;
        ctx.fill();
        ctx.fillStyle = palette.textMuted;
        ctx.textAlign = 'center';
        ctx.fillText(moreText, pillX + mW / 2, pillY + pillH / 2);
      }
    }
  } else {
    // Co-op Mode
    const isWon = data.coopOutcome === 'won';
    const bannerH = 130;

    drawRoundRect(ctx, blockX, blockY, blockW, bannerH, 22);
    ctx.fillStyle = isWon ? palette.greenBg : palette.redBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isWon ? palette.greenBorder : palette.redBorder;
    ctx.stroke();

    ctx.fillStyle = isWon ? palette.greenText : palette.redText;
    ctx.font = `bold 38px ${fontSerif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const outcomeText = isWon ? '🤝 TEAM VICTORY' : '💀 TEAM DEFEAT';
    ctx.fillText(outcomeText, blockX + blockW / 2, blockY + bannerH / 2);

    let nextBlockY = blockY + bannerH + 28;

    // Optional Team Score Box
    if (data.teamScoreFormatted) {
      const scoreBoxH = 88;
      drawRoundRect(ctx, blockX, nextBlockY, blockW, scoreBoxH, 18);
      ctx.fillStyle = palette.surface;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = palette.border;
      ctx.stroke();

      ctx.fillStyle = palette.textMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('FINAL TEAM SCORE', blockX + 28, nextBlockY + scoreBoxH / 2);

      ctx.fillStyle = palette.accent;
      ctx.font = `bold 32px ${fontSans}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${data.teamScoreFormatted} pts`, blockX + blockW - 28, nextBlockY + scoreBoxH / 2);

      nextBlockY += scoreBoxH + 28;
    }

    // THE SQUAD
    const teamPlayers = data.teamPlayers || [];
    if (teamPlayers.length > 0) {
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('THE SQUAD', blockX, nextBlockY);

      let pillX = blockX;
      let pillY = nextBlockY + 28;
      const pillGap = 12;
      const pillH = 46;

      ctx.font = `500 18px ${fontSans}`;
      for (const member of teamPlayers) {
        const textMetrics = ctx.measureText(member.playerName);
        const pW = textMetrics.width + 36;
        if (pillX + pW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }

        drawRoundRect(ctx, pillX, pillY, pW, pillH, 14);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.border;
        ctx.stroke();

        ctx.fillStyle = palette.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(member.playerName, pillX + pW / 2, pillY + pillH / 2);

        pillX += pW + pillGap;
      }

      if (data.overflowTeamCount && data.overflowTeamCount > 0) {
        const moreText = `+${data.overflowTeamCount} more`;
        const mMetrics = ctx.measureText(moreText);
        const mW = mMetrics.width + 32;
        if (pillX + mW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }
        drawRoundRect(ctx, pillX, pillY, mW, pillH, 14);
        ctx.fillStyle = palette.surfaceAlt;
        ctx.fill();
        ctx.fillStyle = palette.textMuted;
        ctx.textAlign = 'center';
        ctx.fillText(moreText, pillX + mW / 2, pillY + pillH / 2);
      }
    }
  }

  // 6. Footer
  const footerY = cardY + cardH - 52;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, footerY - 18);
  ctx.lineTo(cardX + cardW - 36, footerY - 18);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = palette.textSubMuted;
  ctx.font = `500 14px ${fontSans}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEO — BOARD GAME COLLECTION', cardX + 36, footerY);

  ctx.textAlign = 'right';
  ctx.fillText('Recorded with precision', cardX + cardW - 36, footerY);

  // Return PNG Blob
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create canvas blob'));
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}
