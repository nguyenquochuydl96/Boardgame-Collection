import { getMediaImage } from './mediaStorage';
import { SessionShareCardData, ShareCardPlayerAvatar, buildProxiedImageUrl } from './shareCard';

export type ShareCardTheme = 'dark' | 'light';
export type ShareCardStyle = 'poster' | 'ticket';

export interface RenderShareCardOptions {
  theme?: ShareCardTheme;
  style?: ShareCardStyle;
  useTablePhoto?: boolean;
}

interface Palette {
  bg: string;
  cardBg: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
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
    bg: '#141210', // Deep Espresso
    cardBg: '#1D211B', // Dark Olive surface
    surface: '#272A24',
    surfaceAlt: '#32362E',
    surfaceHover: '#3C4236',
    border: 'rgba(250, 246, 238, 0.12)',
    borderLight: 'rgba(250, 246, 238, 0.24)',
    text: '#FAF6EE', // Warm Cream
    textMuted: '#A8A196',
    textSubMuted: '#7A746B',
    accent: '#E5734F', // Terracotta default
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
    surfaceHover: '#DFD7C8',
    border: 'rgba(22, 19, 17, 0.12)',
    borderLight: 'rgba(22, 19, 17, 0.26)',
    text: '#161311', // Deep Espresso
    textMuted: '#6E675E',
    textSubMuted: '#9E968A',
    accent: '#E5734F', // Terracotta default
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
 * Loads an image safely for Canvas drawing without tainting the canvas or throwing SecurityError.
 * 1. idb:// references are resolved via mediaStorage to Data URL.
 * 2. data: and same-origin URLs are loaded directly.
 * 3. External HTTP/HTTPS URLs (like BGG CDN) are first attempted via wsrv.nl CORS proxy (4000ms timeout),
 *    falling back to direct load with crossOrigin="anonymous" (3000ms timeout).
 * 4. Returns null if all attempts fail (triggering elegant fallback).
 */
export async function loadCanvasImageSafe(
  url?: string | null,
  timeoutMs = 4000
): Promise<HTMLImageElement | null> {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Resolve idb:// references
  if (trimmed.startsWith('idb://')) {
    try {
      const dataUrl = await getMediaImage(trimmed);
      if (!dataUrl) return null;
      return await loadHtmlImageElement(dataUrl, timeoutMs);
    } catch {
      return null;
    }
  }

  // 2. Direct data: or relative URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    return await loadHtmlImageElement(trimmed, timeoutMs);
  }

  // 3. External HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Attempt 1: CORS proxy via wsrv.nl
    const proxied = buildProxiedImageUrl(trimmed, 800);
    const proxyResult = await loadHtmlImageElement(proxied, timeoutMs, true);
    if (proxyResult) {
      return proxyResult;
    }

    // Attempt 2: Direct load fallback
    const directResult = await loadHtmlImageElement(trimmed, 3000, true);
    if (directResult) {
      return directResult;
    }
  }

  return null;
}

function loadHtmlImageElement(
  src: string,
  timeoutMs: number,
  useCrossOrigin = false
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, timeoutMs);

    if (useCrossOrigin && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;
  });
}

/**
 * Extracts a dominant warm/vibrant accent color from an image (using a 24x24 offscreen canvas).
 * Falls back to Terracotta (#E5734F) if no suitable color is found.
 */
export function extractAccentColorFromImage(img: HTMLImageElement | null): string {
  if (!img || typeof document === 'undefined') return '#E5734F';
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#E5734F';

    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size).data;

    let bestColor = '#E5734F';
    let bestScore = -1;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      if (a < 128) continue;

      // Brightness (0-255)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < 45 || brightness > 230) continue; // Skip near black and near white

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = (max - min) / 255;
      if (saturation < 0.18) continue; // Skip grayish colors

      // Warmness scoring: warm terracotta, amber, gold, red, orange
      let warmBonus = 1.0;
      if (r > b && r > g) {
        warmBonus = 2.4; // Terracotta / Red / Orange
      } else if (r > b && g >= r * 0.65) {
        warmBonus = 1.9; // Gold / Amber / Warm Yellow
      } else if (g > r && g > b) {
        warmBonus = 1.3; // Forest / Emerald green
      }

      const score = saturation * warmBonus;
      if (score > bestScore) {
        bestScore = score;
        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        bestColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
    }

    return bestColor;
  } catch {
    return '#E5734F';
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
  maxLines = 2
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
 * Draws a circular player avatar on the canvas with smooth clipping and border ring.
 */
function drawPlayerAvatarOnCanvas(
  ctx: CanvasRenderingContext2D,
  avatarImg: HTMLImageElement | null,
  avatar: ShareCardPlayerAvatar,
  cx: number,
  cy: number,
  diameter: number,
  ringColor: string,
  ringWidth = 2
): void {
  const radius = diameter / 2;

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const scale = Math.max(diameter / avatarImg.naturalWidth, diameter / avatarImg.naturalHeight);
    const sw = diameter / scale;
    const sh = diameter / scale;
    const sx = (avatarImg.naturalWidth - sw) / 2;
    const sy = (avatarImg.naturalHeight - sh) / 2;
    ctx.drawImage(avatarImg, sx, sy, sw, sh, cx - radius, cy - radius, diameter, diameter);
    ctx.restore();

    // Ring border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = ringColor;
    ctx.stroke();
  } else {
    // Circle fill with user tint
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = avatar.color ? `${avatar.color}33` : 'rgba(229, 115, 79, 0.2)';
    ctx.fill();

    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = ringColor || avatar.color;
    ctx.stroke();

    if (avatar.avatarEmoji) {
      ctx.font = `${Math.round(diameter * 0.52)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(avatar.avatarEmoji, cx, cy + 1);
    } else {
      ctx.font = `bold ${Math.round(diameter * 0.42)}px sans-serif`;
      ctx.fillStyle = avatar.color || '#E5734F';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(avatar.monogram, cx, cy);
    }
  }
}

/**
 * Draws a deterministic canvas barcode for the ticket stub.
 */
function drawProceduralBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  code: string,
  barColor: string
): void {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }

  let curX = x;
  const endX = x + w;
  let seed = Math.abs(hash) || 12345;

  ctx.fillStyle = barColor;

  // Start guard bars
  ctx.fillRect(curX, y, 3, h);
  curX += 6;
  ctx.fillRect(curX, y, 3, h);
  curX += 6;

  while (curX < endX - 16) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const barWidth = 1.6 + (seed % 4) * 1.2;
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const gapWidth = 2.2 + (seed % 3) * 1.4;

    if (curX + barWidth > endX - 16) break;
    ctx.fillRect(curX, y, barWidth, h);
    curX += barWidth + gapWidth;
  }

  // End guard bars
  ctx.fillRect(endX - 12, y, 3, h);
  ctx.fillRect(endX - 6, y, 3, h);
}

// ---------------------------------------------------------------------------
// HEIGHT CALCULATORS
// ---------------------------------------------------------------------------

function calculatePosterCanvasHeight(data: SessionShareCardData): number {
  const baseH = 750; // Top bar, header, champion spotlight, footer
  let challengersH = 0;

  if (data.mode === 'points') {
    const runnerUps = (data.leaderboard || []).slice(1);
    if (runnerUps.length === 0) {
      challengersH = 50;
    } else if (runnerUps.length <= 3) {
      challengersH = 200; // 1 row of cards
    } else {
      challengersH = 340; // 2 rows of cards
    }
    if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
      challengersH += 36;
    }
  } else if (data.mode === 'win_only') {
    const others = data.otherPlayers || [];
    challengersH = others.length > 0 ? 190 : 60;
  } else {
    // Coop
    challengersH = 150;
  }

  return Math.max(1150, Math.min(1380, baseH + challengersH));
}

function calculateTicketCanvasHeight(data: SessionShareCardData): number {
  const baseH = 780; // Padding, ticket header, boarding pass box, stub, cutouts
  let ledgerH = 0;

  if (data.mode === 'points') {
    const count = (data.leaderboard || []).length;
    ledgerH = 44 + Math.min(count, 7) * 58;
    if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
      ledgerH += 32;
    }
  } else if (data.mode === 'win_only') {
    const wCount = (data.winners || []).length;
    const oCount = (data.otherPlayers || []).length;
    ledgerH = 44 + (wCount + Math.min(oCount, 5)) * 58;
  } else {
    const tCount = (data.teamPlayers || []).length;
    ledgerH = 44 + Math.min(tCount, 6) * 58;
  }

  return Math.max(1180, Math.min(1420, baseH + ledgerH));
}

// ---------------------------------------------------------------------------
// MODEL 1: CHAMPION POSTER RENDERER
// ---------------------------------------------------------------------------

function renderChampionPoster(
  ctx: CanvasRenderingContext2D,
  data: SessionShareCardData,
  palette: Palette,
  accentColor: string,
  coverImg: HTMLImageElement | null,
  backdropImg: HTMLImageElement | null,
  avatarImgMap: Map<string, HTMLImageElement | null>,
  width: number,
  height: number,
  themeKey: ShareCardTheme
): void {
  const fontSerif = '"Playfair Display", Georgia, "Times New Roman", serif';
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // 1. Outer background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Card Container
  const cardMargin = 36;
  const cardX = cardMargin;
  const cardY = cardMargin;
  const cardW = width - cardMargin * 2;
  const cardH = height - cardMargin * 2;
  const cardR = 28;

  ctx.save();
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();

  // Card base fill
  ctx.fillStyle = palette.cardBg;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Atmospheric Cover Backdrop (Safari-safe 48x48 downscale blur)
  const backdropH = 440;
  if (backdropImg) {
    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 48;
      offCanvas.height = 48;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.imageSmoothingEnabled = true;
        offCtx.drawImage(backdropImg, 0, 0, 48, 48);

        ctx.save();
        ctx.globalAlpha = themeKey === 'dark' ? 0.32 : 0.20;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offCanvas, cardX, cardY, cardW, backdropH);
        ctx.restore();
      }
    } catch {
      // Non-fatal fallback
    }

    // Gradient scrim fading smoothly to card background
    const scrim = ctx.createLinearGradient(0, cardY, 0, cardY + backdropH);
    if (themeKey === 'dark') {
      scrim.addColorStop(0, 'rgba(29, 33, 27, 0.40)');
      scrim.addColorStop(0.65, 'rgba(29, 33, 27, 0.85)');
      scrim.addColorStop(1, palette.cardBg);
    } else {
      scrim.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
      scrim.addColorStop(0.65, 'rgba(255, 255, 255, 0.88)');
      scrim.addColorStop(1, palette.cardBg);
    }
    ctx.fillStyle = scrim;
    ctx.fillRect(cardX, cardY, cardW, backdropH);
  }

  // Radial accent glow behind Champion Spotlight
  const glowX = cardX + cardW / 2;
  const glowY = cardY + 360;
  const glow = ctx.createRadialGradient(glowX, glowY, 30, glowX, glowY, 320);
  glow.addColorStop(0, `${accentColor}33`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(cardX, cardY + 120, cardW, 460);

  ctx.restore();

  // Card Outer Border
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // 3. Top Bar
  // Left: Brand
  ctx.fillStyle = accentColor;
  ctx.font = `bold 15px ${fontSans}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEO — BOARD GAME COLLECTION', cardX + 34, cardY + 40);

  // Right: Badges / Pills
  let pillRightX = cardX + cardW - 34;

  // Play #N pill
  ctx.font = `bold 15px ${fontSans}`;
  const playText = data.playIndexFormatted;
  const playMetrics = ctx.measureText(playText);
  const playPillW = playMetrics.width + 26;
  const playPillH = 32;
  const playPillX = pillRightX - playPillW;
  const playPillY = cardY + 40 - playPillH / 2;

  drawRoundRect(ctx, playPillX, playPillY, playPillW, playPillH, 16);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.fillText(playText, playPillX + playPillW / 2, cardY + 40);

  pillRightX = playPillX - 10;

  // NEW RECORD pill (if applicable)
  if (data.isNewRecord) {
    const recText = '★ NEW RECORD';
    const recMetrics = ctx.measureText(recText);
    const recPillW = recMetrics.width + 26;
    const recPillH = 32;
    const recPillX = pillRightX - recPillW;
    const recPillY = cardY + 40 - recPillH / 2;

    drawRoundRect(ctx, recPillX, recPillY, recPillW, recPillH, 16);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(recText, recPillX + recPillW / 2, cardY + 40);
  }

  // Divider 1
  const divY1 = cardY + 70;
  ctx.beginPath();
  ctx.moveTo(cardX + 34, divY1);
  ctx.lineTo(cardX + cardW - 34, divY1);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Compact Game Header
  const headerX = cardX + 34;
  const headerY = divY1 + 18;
  const coverSize = 120;
  const coverR = 16;

  if (coverImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    drawRoundRect(ctx, headerX, headerY, coverSize, coverSize, coverR);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundRect(ctx, headerX, headerY, coverSize, coverSize, coverR);
    ctx.clip();
    const scale = Math.max(coverSize / coverImg.naturalWidth, coverSize / coverImg.naturalHeight);
    const sw = coverSize / scale;
    const sh = coverSize / scale;
    const sx = (coverImg.naturalWidth - sw) / 2;
    const sy = (coverImg.naturalHeight - sh) / 2;
    ctx.drawImage(coverImg, sx, sy, sw, sh, headerX, headerY, coverSize, coverSize);
    ctx.restore();

    drawRoundRect(ctx, headerX, headerY, coverSize, coverSize, coverR);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.borderLight;
    ctx.stroke();
  } else {
    drawRoundRect(ctx, headerX, headerY, coverSize, coverSize, coverR);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = `italic bold 44px ${fontSerif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getMonogram(data.gameTitle), headerX + coverSize / 2, headerY + coverSize / 2);
  }

  // Header Text
  const titleX = headerX + coverSize + 28;
  const maxTitleW = cardW - 68 - coverSize - 28;

  ctx.fillStyle = palette.text;
  ctx.font = `bold 42px ${fontSerif}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const titleLines = wrapText(ctx, data.gameTitle, maxTitleW, 2);
  let curTitleY = headerY + 4;
  for (const line of titleLines) {
    ctx.fillText(line, titleX, curTitleY);
    curTitleY += 48;
  }

  // Metadata line
  const metaParts = [
    data.dateFormatted,
    data.locationName,
    data.durationFormatted,
    data.playerCountFormatted,
  ].filter(Boolean);

  ctx.fillStyle = palette.textMuted;
  ctx.font = `500 17px ${fontSans}`;
  ctx.textBaseline = 'top';
  ctx.fillText(metaParts.join('   ·   '), titleX, headerY + coverSize - 26);

  // Divider 2
  const divY2 = headerY + coverSize + 18;
  ctx.beginPath();
  ctx.moveTo(cardX + 34, divY2);
  ctx.lineTo(cardX + cardW - 34, divY2);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. Central Champion Spotlight
  const spotY = divY2 + 20;

  if (data.mode === 'points') {
    const players = data.leaderboard || [];
    const winners = players.filter((p) => p.rank === 1);
    const isSingleWinner = winners.length === 1;

    if (isSingleWinner) {
      const winner = winners[0];
      const avatarSize = 164;
      const avatarCx = cardX + cardW / 2;
      const avatarCy = spotY + avatarSize / 2 + 10;
      const pImg = avatarImgMap.get(winner.playerName) || null;

      // Outer ring with glow
      ctx.beginPath();
      ctx.arc(avatarCx, avatarCy, avatarSize / 2 + 7, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `${accentColor}55`;
      ctx.stroke();

      // Avatar
      drawPlayerAvatarOnCanvas(
        ctx,
        pImg,
        winner,
        avatarCx,
        avatarCy,
        avatarSize,
        accentColor,
        3.5
      );

      // Crown Badge atop avatar
      const crownW = 46;
      const crownH = 28;
      const crownX = avatarCx - crownW / 2;
      const crownY = avatarCy - avatarSize / 2 - 14;
      drawRoundRect(ctx, crownX, crownY, crownW, crownH, 14);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', avatarCx, crownY + crownH / 2);

      // Subtitle
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('CHAMPION', avatarCx, avatarCy + avatarSize / 2 + 14);

      // Winner Name
      ctx.fillStyle = palette.text;
      ctx.font = `bold 42px ${fontSerif}`;
      ctx.fillText(winner.playerName, avatarCx, avatarCy + avatarSize / 2 + 34);

      // Massive Score
      const scoreY = avatarCy + avatarSize / 2 + 84;
      ctx.fillStyle = accentColor;
      ctx.font = `bold 96px ${fontSans}`;
      const scoreStr = winner.scoreFormatted;
      const scoreMetrics = ctx.measureText(scoreStr);

      ctx.font = `bold 28px ${fontSans}`;
      const ptsMetrics = ctx.measureText(' PTS');
      const totalScoreW = scoreMetrics.width + ptsMetrics.width;

      const scoreStartX = avatarCx - totalScoreW / 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = accentColor;
      ctx.font = `bold 96px ${fontSans}`;
      ctx.fillText(scoreStr, scoreStartX, scoreY);

      ctx.fillStyle = palette.textMuted;
      ctx.font = `bold 28px ${fontSans}`;
      ctx.fillText(' PTS', scoreStartX + scoreMetrics.width, scoreY + 12);

      // Callout Badge + Streak Pills Row
      const pillsY = scoreY + 68;
      let pills = [data.calloutBadge];
      if (data.winnerGameStreak && data.winnerGameStreak >= 2) {
        pills.push(`🔥 ${data.winnerGameStreak}-WIN STREAK`);
      }

      ctx.font = `bold 14px ${fontSans}`;
      const pillSpacings = 12;
      const pillWidths = pills.map((p) => ctx.measureText(p).width + 30);
      const totalPillsW =
        pillWidths.reduce((a, b) => a + b, 0) + (pills.length - 1) * pillSpacings;
      let curPillX = avatarCx - totalPillsW / 2;

      for (let i = 0; i < pills.length; i++) {
        const text = pills[i];
        const pW = pillWidths[i];
        const pH = 32;

        drawRoundRect(ctx, curPillX, pillsY - pH / 2, pW, pH, 16);
        ctx.fillStyle = i === 0 ? palette.surface : `${accentColor}22`;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = i === 0 ? palette.border : accentColor;
        ctx.stroke();

        ctx.fillStyle = i === 0 ? palette.text : accentColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, curPillX + pW / 2, pillsY);

        curPillX += pW + pillSpacings;
      }
    } else {
      // Tied Winners (2 or 3)
      const count = Math.min(3, winners.length);
      const avatarSize = 124;
      const spacing = 40;
      const totalRowW = count * avatarSize + (count - 1) * spacing;
      let startX = cardX + cardW / 2 - totalRowW / 2;
      const avatarCy = spotY + avatarSize / 2 + 10;

      for (let i = 0; i < count; i++) {
        const w = winners[i];
        const avatarCx = startX + avatarSize / 2;
        const pImg = avatarImgMap.get(w.playerName) || null;

        drawPlayerAvatarOnCanvas(ctx, pImg, w, avatarCx, avatarCy, avatarSize, accentColor, 3);

        // Crown
        drawRoundRect(ctx, avatarCx - 18, avatarCy - avatarSize / 2 - 12, 36, 24, 12);
        ctx.fillStyle = accentColor;
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', avatarCx, avatarCy - avatarSize / 2);

        // Name
        ctx.fillStyle = palette.text;
        ctx.font = `bold 24px ${fontSans}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(w.playerName, avatarCx, avatarCy + avatarSize / 2 + 14);

        // Score
        ctx.fillStyle = accentColor;
        ctx.font = `bold 42px ${fontSans}`;
        ctx.fillText(`${w.scoreFormatted} pts`, avatarCx, avatarCy + avatarSize / 2 + 44);

        startX += avatarSize + spacing;
      }

      // Shared Victory badge below
      const badgeY = avatarCy + avatarSize / 2 + 104;
      const badgeText = 'SHARED VICTORY';
      ctx.font = `bold 15px ${fontSans}`;
      const bW = ctx.measureText(badgeText).width + 36;
      drawRoundRect(ctx, cardX + cardW / 2 - bW / 2, badgeY - 17, bW, 34, 17);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, cardX + cardW / 2, badgeY);
    }

    // 6. Challengers Podium Grid
    const runnerUps = players.filter((p) => p.rank > 1);
    if (runnerUps.length > 0) {
      const gridY = isSingleWinner ? spotY + 380 : spotY + 300;

      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 13px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('CHALLENGERS', cardX + 34, gridY);

      const cols = runnerUps.length <= 2 ? runnerUps.length : 3;
      const cardGap = 16;
      const totalGapW = (cols - 1) * cardGap;
      const gridCardW = (cardW - 68 - totalGapW) / cols;
      const gridCardH = 96;

      const displayRunnerUps = runnerUps.slice(0, 6);
      for (let i = 0; i < displayRunnerUps.length; i++) {
        const ru = displayRunnerUps[i];
        const row = Math.floor(i / cols);
        const col = i % cols;
        const cX = cardX + 34 + col * (gridCardW + cardGap);
        const cY = gridY + 24 + row * (gridCardH + cardGap);

        drawRoundRect(ctx, cX, cY, gridCardW, gridCardH, 16);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.border;
        ctx.stroke();

        // Rank badge
        const rBadgeSize = 28;
        const rX = cX + 12;
        const rY = cY + (gridCardH - rBadgeSize) / 2;
        drawRoundRect(ctx, rX, rY, rBadgeSize, rBadgeSize, 8);
        ctx.fillStyle = palette.surfaceAlt;
        ctx.fill();
        ctx.fillStyle = palette.textMuted;
        ctx.font = `bold 13px ${fontSans}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${ru.rank}`, rX + rBadgeSize / 2, rY + rBadgeSize / 2);

        // Avatar
        const aSize = 52;
        const aCx = rX + rBadgeSize + 10 + aSize / 2;
        const aCy = cY + gridCardH / 2;
        const pImg = avatarImgMap.get(ru.playerName) || null;
        drawPlayerAvatarOnCanvas(ctx, pImg, ru, aCx, aCy, aSize, palette.borderLight, 1.5);

        // Name & Score
        const textStartX = aCx + aSize / 2 + 12;
        ctx.fillStyle = palette.text;
        ctx.font = `bold 18px ${fontSans}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const truncatedName = wrapText(ctx, ru.playerName, gridCardW - (textStartX - cX) - 12, 1)[0];
        ctx.fillText(truncatedName || ru.playerName, textStartX, cY + 20);

        // Score & Gap
        ctx.fillStyle = palette.text;
        ctx.font = `bold 22px ${fontSans}`;
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${ru.scoreFormatted} pts`, textStartX, cY + gridCardH - 18);

        if (ru.gapFromLeaderText) {
          ctx.font = `bold 13px ${fontSans}`;
          const gapW = ctx.measureText(ru.gapFromLeaderText).width + 12;
          const gapH = 20;
          const gapX = cX + gridCardW - gapW - 12;
          const gapY = cY + gridCardH - gapH - 18;

          drawRoundRect(ctx, gapX, gapY, gapW, gapH, 6);
          ctx.fillStyle = palette.surfaceAlt;
          ctx.fill();
          ctx.fillStyle = palette.textMuted;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ru.gapFromLeaderText, gapX + gapW / 2, gapY + gapH / 2);
        }
      }

      if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
        const lastRow = Math.ceil(displayRunnerUps.length / cols);
        const overY = gridY + 24 + lastRow * (gridCardH + cardGap) + 4;
        ctx.fillStyle = palette.textMuted;
        ctx.font = `italic 15px ${fontSans}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`+${data.overflowPlayerCount} more players`, cardX + cardW / 2, overY);
      }
    }
  } else if (data.mode === 'win_only') {
    // Win Only Mode
    const winners = data.winners || [];
    const isSingleWinner = winners.length === 1;

    if (isSingleWinner) {
      const winner = winners[0];
      const avatarSize = 164;
      const avatarCx = cardX + cardW / 2;
      const avatarCy = spotY + avatarSize / 2 + 10;
      const pImg = avatarImgMap.get(winner.playerName) || null;

      drawPlayerAvatarOnCanvas(ctx, pImg, winner, avatarCx, avatarCy, avatarSize, accentColor, 3.5);

      // Crown badge
      drawRoundRect(ctx, avatarCx - 23, avatarCy - avatarSize / 2 - 14, 46, 28, 14);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', avatarCx, avatarCy - avatarSize / 2);

      // Subtitle
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('VICTORY', avatarCx, avatarCy + avatarSize / 2 + 16);

      // Winner Name
      ctx.fillStyle = palette.text;
      ctx.font = `bold 44px ${fontSerif}`;
      ctx.fillText(winner.playerName, avatarCx, avatarCy + avatarSize / 2 + 38);

      // Pills Row
      const pillsY = avatarCy + avatarSize / 2 + 106;
      let pills = [data.calloutBadge];
      if (data.winnerGameStreak && data.winnerGameStreak >= 2) {
        pills.push(`🔥 ${data.winnerGameStreak}-WIN STREAK`);
      }

      ctx.font = `bold 14px ${fontSans}`;
      const pillSpacings = 12;
      const pillWidths = pills.map((p) => ctx.measureText(p).width + 30);
      const totalPillsW =
        pillWidths.reduce((a, b) => a + b, 0) + (pills.length - 1) * pillSpacings;
      let curPillX = avatarCx - totalPillsW / 2;

      for (let i = 0; i < pills.length; i++) {
        const text = pills[i];
        const pW = pillWidths[i];
        const pH = 34;

        drawRoundRect(ctx, curPillX, pillsY - pH / 2, pW, pH, 17);
        ctx.fillStyle = i === 0 ? palette.surface : `${accentColor}22`;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = i === 0 ? palette.border : accentColor;
        ctx.stroke();

        ctx.fillStyle = i === 0 ? palette.text : accentColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, curPillX + pW / 2, pillsY);

        curPillX += pW + pillSpacings;
      }
    } else {
      // Multi Winners
      const count = Math.min(3, winners.length);
      const avatarSize = 124;
      const spacing = 36;
      const totalRowW = count * avatarSize + (count - 1) * spacing;
      let startX = cardX + cardW / 2 - totalRowW / 2;
      const avatarCy = spotY + avatarSize / 2 + 10;

      for (let i = 0; i < count; i++) {
        const w = winners[i];
        const avatarCx = startX + avatarSize / 2;
        const pImg = avatarImgMap.get(w.playerName) || null;

        drawPlayerAvatarOnCanvas(ctx, pImg, w, avatarCx, avatarCy, avatarSize, accentColor, 3);

        // Crown
        drawRoundRect(ctx, avatarCx - 18, avatarCy - avatarSize / 2 - 12, 36, 24, 12);
        ctx.fillStyle = accentColor;
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', avatarCx, avatarCy - avatarSize / 2);

        // Name
        ctx.fillStyle = palette.text;
        ctx.font = `bold 26px ${fontSans}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(w.playerName, avatarCx, avatarCy + avatarSize / 2 + 16);

        startX += avatarSize + spacing;
      }

      // Badge below
      const badgeY = avatarCy + avatarSize / 2 + 64;
      const badgeText = `${winners.length} WINNERS`;
      ctx.font = `bold 15px ${fontSans}`;
      const bW = ctx.measureText(badgeText).width + 36;
      drawRoundRect(ctx, cardX + cardW / 2 - bW / 2, badgeY - 17, bW, 34, 17);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, cardX + cardW / 2, badgeY);
    }

    // ALSO PLAYED
    const otherPlayers = data.otherPlayers || [];
    if (otherPlayers.length > 0) {
      const alsoY = spotY + 340;
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 13px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('ALSO PLAYED', cardX + 34, alsoY);

      let pillX = cardX + 34;
      let pillY = alsoY + 24;
      const pillGap = 12;
      const pillH = 48;

      for (const other of otherPlayers) {
        ctx.font = `500 17px ${fontSans}`;
        const textMetrics = ctx.measureText(other.playerName);
        const aSize = 34;
        const pW = aSize + textMetrics.width + 44;

        if (pillX + pW > cardX + cardW - 34) {
          pillX = cardX + 34;
          pillY += pillH + pillGap;
        }

        drawRoundRect(ctx, pillX, pillY, pW, pillH, 16);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.border;
        ctx.stroke();

        const pImg = avatarImgMap.get(other.playerName) || null;
        drawPlayerAvatarOnCanvas(
          ctx,
          pImg,
          other,
          pillX + 12 + aSize / 2,
          pillY + pillH / 2,
          aSize,
          palette.borderLight,
          1.5
        );

        ctx.fillStyle = palette.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(other.playerName, pillX + 12 + aSize + 10, pillY + pillH / 2);

        pillX += pW + pillGap;
      }
    }
  } else {
    // Co-op Mode
    const isWon = data.coopOutcome === 'won';
    const bannerH = 110;

    drawRoundRect(ctx, cardX + 34, spotY, cardW - 68, bannerH, 20);
    ctx.fillStyle = isWon ? palette.greenBg : palette.redBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isWon ? palette.greenBorder : palette.redBorder;
    ctx.stroke();

    ctx.fillStyle = isWon ? palette.greenText : palette.redText;
    ctx.font = `bold 36px ${fontSerif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      isWon ? '🤝 TEAM VICTORY' : '💀 TEAM DEFEAT',
      cardX + cardW / 2,
      spotY + bannerH / 2
    );

    let nextY = spotY + bannerH + 24;

    // Optional Team Score
    if (data.teamScoreFormatted) {
      ctx.fillStyle = palette.textMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('FINAL TEAM SCORE', cardX + cardW / 2, nextY);

      ctx.fillStyle = accentColor;
      ctx.font = `bold 48px ${fontSans}`;
      ctx.fillText(`${data.teamScoreFormatted} pts`, cardX + cardW / 2, nextY + 22);

      nextY += 86;
    }

    // THE SQUAD
    const team = data.teamPlayers || [];
    if (team.length > 0) {
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 13px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('THE SQUAD', cardX + 34, nextY);

      const aSize = 64;
      const count = Math.min(6, team.length);
      const spacing = 28;
      const totalW = count * aSize + (count - 1) * spacing;
      let squadX = cardX + cardW / 2 - totalW / 2;
      const squadY = nextY + 30 + aSize / 2;

      for (let i = 0; i < count; i++) {
        const member = team[i];
        const mCx = squadX + aSize / 2;
        const pImg = avatarImgMap.get(member.playerName) || null;

        drawPlayerAvatarOnCanvas(ctx, pImg, member, mCx, squadY, aSize, palette.borderLight, 2);

        ctx.fillStyle = palette.text;
        ctx.font = `bold 15px ${fontSans}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(member.playerName, mCx, squadY + aSize / 2 + 10);

        squadX += aSize + spacing;
      }
    }
  }

  // 7. Footer
  const footerY = cardY + cardH - 42;
  ctx.beginPath();
  ctx.moveTo(cardX + 34, footerY - 18);
  ctx.lineTo(cardX + cardW - 34, footerY - 18);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = palette.textSubMuted;
  ctx.font = `500 15px ${fontSans}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEO — BOARD GAME COLLECTION', cardX + 34, footerY);

  ctx.textAlign = 'right';
  ctx.fillText(data.venueDateFormatted, cardX + cardW - 34, footerY);
}

// ---------------------------------------------------------------------------
// MODEL 2: GAME NIGHT TICKET RENDERER
// ---------------------------------------------------------------------------

function renderGameNightTicket(
  ctx: CanvasRenderingContext2D,
  data: SessionShareCardData,
  palette: Palette,
  accentColor: string,
  coverImg: HTMLImageElement | null,
  avatarImgMap: Map<string, HTMLImageElement | null>,
  width: number,
  height: number,
  themeKey: ShareCardTheme
): void {
  const fontSerif = '"Playfair Display", Georgia, "Times New Roman", serif';
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const fontMono = '"SF Mono", "Roboto Mono", Menlo, Consolas, Monaco, monospace';

  // 1. Dark canvas base
  const outerBg = themeKey === 'dark' ? '#0E0C0B' : '#EBE4D6';
  ctx.fillStyle = outerBg;
  ctx.fillRect(0, 0, width, height);

  // 2. Ticket Body
  const ticketMargin = 36;
  const ticketX = ticketMargin;
  const ticketY = ticketMargin;
  const ticketW = width - ticketMargin * 2;
  const ticketH = height - ticketMargin * 2;
  const ticketR = 24;

  const ticketBodyColor = themeKey === 'dark' ? '#1C1815' : '#FAF6EE';

  drawRoundRect(ctx, ticketX, ticketY, ticketW, ticketH, ticketR);
  ctx.fillStyle = ticketBodyColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // Inner hairline double border (6px inset)
  drawRoundRect(ctx, ticketX + 8, ticketY + 8, ticketW - 16, ticketH - 16, ticketR - 6);
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // 3. Top Header
  const headY = ticketY + 36;

  // Monospace top line
  ctx.font = `bold 14px ${fontMono}`;
  ctx.fillStyle = palette.textMuted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TABLETOP SESSION PASS', ticketX + 36, headY);

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'right';
  ctx.fillText(data.ticketSerial, ticketX + ticketW - 36, headY);

  // Thin line below top meta
  const lineY1 = headY + 28;
  ctx.beginPath();
  ctx.moveTo(ticketX + 36, lineY1);
  ctx.lineTo(ticketX + ticketW - 36, lineY1);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Box Cover & Game Title
  const coverSize = 110;
  const coverX = ticketX + 36;
  const coverY = lineY1 + 20;

  if (coverImg) {
    ctx.save();
    drawRoundRect(ctx, coverX, coverY, coverSize, coverSize, 12);
    ctx.clip();
    const scale = Math.max(coverSize / coverImg.naturalWidth, coverSize / coverImg.naturalHeight);
    const sw = coverSize / scale;
    const sh = coverSize / scale;
    const sx = (coverImg.naturalWidth - sw) / 2;
    const sy = (coverImg.naturalHeight - sh) / 2;
    ctx.drawImage(coverImg, sx, sy, sw, sh, coverX, coverY, coverSize, coverSize);
    ctx.restore();

    drawRoundRect(ctx, coverX, coverY, coverSize, coverSize, 12);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();
  } else {
    drawRoundRect(ctx, coverX, coverY, coverSize, coverSize, 12);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = `italic bold 40px ${fontSerif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getMonogram(data.gameTitle), coverX + coverSize / 2, coverY + coverSize / 2);
  }

  const titleX = coverX + coverSize + 24;
  const titleW = ticketW - 72 - coverSize - 24;

  ctx.fillStyle = palette.text;
  ctx.font = `bold 38px ${fontSerif}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const titleLines = wrapText(ctx, data.gameTitle, titleW, 2);
  let curTY = coverY + 4;
  for (const line of titleLines) {
    ctx.fillText(line, titleX, curTY);
    curTY += 44;
  }

  ctx.fillStyle = palette.textMuted;
  ctx.font = `500 15px ${fontMono}`;
  ctx.fillText('OFFICIAL TABLETOP RECORD · HEO COLLECTION', titleX, coverY + coverSize - 22);

  // 4. Boarding Pass 4-Column Metadata Table
  const boxY = coverY + coverSize + 22;
  const boxH = 68;
  const boxW = ticketW - 72;
  const colW = boxW / 4;

  drawRoundRect(ctx, ticketX + 36, boxY, boxW, boxH, 12);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // Column Dividers
  for (let c = 1; c < 4; c++) {
    ctx.beginPath();
    ctx.moveTo(ticketX + 36 + c * colW, boxY);
    ctx.lineTo(ticketX + 36 + c * colW, boxY + boxH);
    ctx.strokeStyle = palette.border;
    ctx.stroke();
  }

  const columns = [
    { label: 'DATE', val: data.dateFormatted.toUpperCase() },
    { label: 'VENUE', val: (data.locationName || 'N/A').toUpperCase() },
    { label: 'TIME', val: (data.durationFormatted || 'N/A').toUpperCase() },
    { label: 'PLAYERS', val: data.playerCountFormatted.toUpperCase() },
  ];

  for (let c = 0; c < 4; c++) {
    const colX = ticketX + 36 + c * colW + colW / 2;
    ctx.fillStyle = palette.textSubMuted;
    ctx.font = `bold 11px ${fontMono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(columns[c].label, colX, boxY + 14);

    ctx.fillStyle = palette.text;
    ctx.font = `bold 15px ${fontMono}`;
    ctx.fillText(columns[c].val, colX, boxY + 34);
  }

  // 5. Middle: Official Ledger
  const ledgerY = boxY + boxH + 28;
  const stubY = ticketY + ticketH - 240;

  ctx.fillStyle = palette.textSubMuted;
  ctx.font = `bold 13px ${fontMono}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('OFFICIAL LEDGER', ticketX + 36, ledgerY);

  ctx.beginPath();
  ctx.moveTo(ticketX + 175, ledgerY + 8);
  ctx.lineTo(ticketX + ticketW - 36, ledgerY + 8);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Player Rows
  const rowStartY = ledgerY + 28;
  const rowH = 54;

  if (data.mode === 'points') {
    const players = data.leaderboard || [];
    const displayCount = Math.min(7, players.length);

    for (let i = 0; i < displayCount; i++) {
      const p = players[i];
      const rY = rowStartY + i * rowH;

      // Rank
      ctx.fillStyle = p.rank === 1 ? accentColor : palette.textMuted;
      ctx.font = `bold 15px ${fontMono}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${p.rank}`, ticketX + 36, rY + rowH / 2);

      // Avatar
      const aSize = 38;
      const aCx = ticketX + 80 + aSize / 2;
      const aCy = rY + rowH / 2;
      const pImg = avatarImgMap.get(p.playerName) || null;
      drawPlayerAvatarOnCanvas(
        ctx,
        pImg,
        p,
        aCx,
        aCy,
        aSize,
        p.rank === 1 ? accentColor : palette.borderLight,
        1.5
      );

      // Name
      ctx.fillStyle = palette.text;
      ctx.font = `bold 19px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const nameStartX = aCx + aSize / 2 + 14;
      ctx.fillText(p.playerName, nameStartX, rY + rowH / 2);

      const nameW = ctx.measureText(p.playerName).width;

      // Score on right
      const scoreStr = `${p.scoreFormatted} PTS`;
      ctx.font = `bold 20px ${fontMono}`;
      const scoreW = ctx.measureText(scoreStr).width;
      const scoreEndX = ticketX + ticketW - 36;
      const scoreStartX = scoreEndX - scoreW;

      ctx.fillStyle = p.rank === 1 ? accentColor : palette.text;
      ctx.textAlign = 'right';
      ctx.fillText(scoreStr, scoreEndX, rY + rowH / 2);

      // Dots leader line between name and score
      const dotsStartX = nameStartX + nameW + 16;
      let dotsEndX = scoreStartX - 16;

      if (p.gapFromLeaderText) {
        ctx.font = `bold 13px ${fontMono}`;
        const gapStr = `(${p.gapFromLeaderText})`;
        const gapW = ctx.measureText(gapStr).width + 12;
        dotsEndX = scoreStartX - gapW - 20;

        ctx.fillStyle = palette.textMuted;
        ctx.textAlign = 'right';
        ctx.fillText(gapStr, scoreStartX - 10, rY + rowH / 2);
      }

      if (dotsEndX > dotsStartX + 20) {
        ctx.fillStyle = palette.borderLight;
        ctx.font = `14px ${fontMono}`;
        ctx.textAlign = 'left';
        const numDots = Math.floor((dotsEndX - dotsStartX) / 12);
        const dotsText = ' ·'.repeat(numDots);
        ctx.fillText(dotsText, dotsStartX, rY + rowH / 2 + 1);
      }
    }

    if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
      const overY = rowStartY + displayCount * rowH + 8;
      ctx.fillStyle = palette.textMuted;
      ctx.font = `italic 14px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`+${data.overflowPlayerCount} more players`, ticketX + ticketW / 2, overY);
    }
  } else if (data.mode === 'win_only') {
    const winners = data.winners || [];
    const others = data.otherPlayers || [];
    const all = [
      ...winners.map((w) => ({ ...w, isWin: true })),
      ...others.map((o) => ({ ...o, isWin: false })),
    ];
    const displayCount = Math.min(7, all.length);

    for (let i = 0; i < displayCount; i++) {
      const p = all[i];
      const rY = rowStartY + i * rowH;

      ctx.fillStyle = p.isWin ? accentColor : palette.textMuted;
      ctx.font = `bold 15px ${fontMono}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.isWin ? '👑' : '•', ticketX + 36, rY + rowH / 2);

      const aSize = 38;
      const aCx = ticketX + 80 + aSize / 2;
      const aCy = rY + rowH / 2;
      const pImg = avatarImgMap.get(p.playerName) || null;
      drawPlayerAvatarOnCanvas(
        ctx,
        pImg,
        p,
        aCx,
        aCy,
        aSize,
        p.isWin ? accentColor : palette.borderLight,
        1.5
      );

      ctx.fillStyle = palette.text;
      ctx.font = `bold 19px ${fontSans}`;
      ctx.textAlign = 'left';
      const nameStartX = aCx + aSize / 2 + 14;
      ctx.fillText(p.playerName, nameStartX, rY + rowH / 2);

      const nameW = ctx.measureText(p.playerName).width;
      const statusText = p.isWin ? 'VICTORY' : 'PLAYED';
      ctx.font = `bold 16px ${fontMono}`;
      const statusW = ctx.measureText(statusText).width;
      const statusEndX = ticketX + ticketW - 36;

      ctx.fillStyle = p.isWin ? accentColor : palette.textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(statusText, statusEndX, rY + rowH / 2);

      const dotsStartX = nameStartX + nameW + 16;
      const dotsEndX = statusEndX - statusW - 16;
      if (dotsEndX > dotsStartX + 20) {
        ctx.fillStyle = palette.borderLight;
        ctx.font = `14px ${fontMono}`;
        ctx.textAlign = 'left';
        const numDots = Math.floor((dotsEndX - dotsStartX) / 12);
        ctx.fillText(' ·'.repeat(numDots), dotsStartX, rY + rowH / 2 + 1);
      }
    }
  } else {
    // Coop Mode
    const team = data.teamPlayers || [];
    const displayCount = Math.min(6, team.length);

    for (let i = 0; i < displayCount; i++) {
      const p = team[i];
      const rY = rowStartY + i * rowH;

      ctx.fillStyle = accentColor;
      ctx.font = `bold 15px ${fontMono}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤝', ticketX + 36, rY + rowH / 2);

      const aSize = 38;
      const aCx = ticketX + 80 + aSize / 2;
      const aCy = rY + rowH / 2;
      const pImg = avatarImgMap.get(p.playerName) || null;
      drawPlayerAvatarOnCanvas(ctx, pImg, p, aCx, aCy, aSize, palette.borderLight, 1.5);

      ctx.fillStyle = palette.text;
      ctx.font = `bold 19px ${fontSans}`;
      ctx.textAlign = 'left';
      const nameStartX = aCx + aSize / 2 + 14;
      ctx.fillText(p.playerName, nameStartX, rY + rowH / 2);

      const nameW = ctx.measureText(p.playerName).width;
      const statusText = 'SQUAD';
      ctx.font = `bold 16px ${fontMono}`;
      const statusW = ctx.measureText(statusText).width;
      const statusEndX = ticketX + ticketW - 36;

      ctx.fillStyle = palette.textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(statusText, statusEndX, rY + rowH / 2);

      const dotsStartX = nameStartX + nameW + 16;
      const dotsEndX = statusEndX - statusW - 16;
      if (dotsEndX > dotsStartX + 20) {
        ctx.fillStyle = palette.borderLight;
        ctx.font = `14px ${fontMono}`;
        ctx.textAlign = 'left';
        const numDots = Math.floor((dotsEndX - dotsStartX) / 12);
        ctx.fillText(' ·'.repeat(numDots), dotsStartX, rY + rowH / 2 + 1);
      }
    }
  }

  // Tilted Rubber Stamp (-11°)
  // Positioned in top-right / middle region of ledger
  const stampX = ticketX + ticketW - 170;
  const stampY = ledgerY + 70;
  const stampW = 230;
  const stampH = 76;
  const stampColor = themeKey === 'dark' ? '#D95338' : '#C94A30';

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate((-11 * Math.PI) / 180);

  // Double rounded rect border
  drawRoundRect(ctx, -stampW / 2, -stampH / 2, stampW, stampH, 12);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = stampColor;
  ctx.stroke();

  drawRoundRect(ctx, -stampW / 2 + 4, -stampH / 2 + 4, stampW - 8, stampH - 8, 8);
  ctx.lineWidth = 1;
  ctx.strokeStyle = stampColor;
  ctx.stroke();

  ctx.fillStyle = stampColor;
  ctx.font = `bold 10px ${fontMono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('★ OFFICIAL REGISTRY ★', 0, -stampH / 2 + 10);

  ctx.font = `bold 19px ${fontSans}`;
  ctx.fillText(data.calloutBadge, 0, -stampH / 2 + 25);

  let stampSub = data.locationName || 'VERIFIED';
  if (data.mode === 'points' && data.leaderboard?.[0]) {
    stampSub = `${data.leaderboard[0].playerName} · ${data.leaderboard[0].scoreFormatted} PTS`;
  }
  ctx.font = `bold 11px ${fontMono}`;
  ctx.fillText(stampSub, 0, -stampH / 2 + 50);

  ctx.restore();

  // 6. Perforated Notch & Dashed Line
  const notchR = 22;

  // Left notch
  ctx.beginPath();
  ctx.arc(ticketX, stubY, notchR, -Math.PI / 2, Math.PI / 2);
  ctx.fillStyle = outerBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // Right notch
  ctx.beginPath();
  ctx.arc(ticketX + ticketW, stubY, notchR, Math.PI / 2, -Math.PI / 2);
  ctx.fillStyle = outerBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // Perforated Dashed Line
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([12, 10]);
  ctx.moveTo(ticketX + notchR, stubY);
  ctx.lineTo(ticketX + ticketW - notchR, stubY);
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();
  ctx.restore();

  // 7. Bottom Tear-off Stub
  const stubContentY = stubY + 32;

  // Left side: Winner summary
  ctx.fillStyle = accentColor;
  ctx.font = `bold 13px ${fontMono}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('HEO — BOARD GAME COLLECTION', ticketX + 36, stubContentY);

  let winHeadline = 'MATCH COMPLETED';
  if (data.mode === 'points' && data.leaderboard?.[0]) {
    winHeadline = `WINNER: ${data.leaderboard[0].playerName.toUpperCase()} (${data.leaderboard[0].scoreFormatted} PTS)`;
  } else if (data.mode === 'win_only' && data.winners?.[0]) {
    winHeadline = `WINNER: ${data.winners[0].playerName.toUpperCase()}`;
  } else if (data.mode === 'coop') {
    winHeadline = data.coopOutcome === 'won' ? 'TEAM VICTORY' : 'TEAM DEFEAT';
    if (data.teamScoreFormatted) winHeadline += ` (${data.teamScoreFormatted} PTS)`;
  }

  ctx.fillStyle = palette.text;
  ctx.font = `bold 22px ${fontSerif}`;
  ctx.fillText(winHeadline, ticketX + 36, stubContentY + 24);

  ctx.fillStyle = palette.textMuted;
  ctx.font = `500 14px ${fontMono}`;
  ctx.fillText(
    `Played at ${data.locationName} · ${data.dateFormatted}`,
    ticketX + 36,
    stubContentY + 60
  );

  // Right side: Barcode & Barcode Code
  const barcodeW = 240;
  const barcodeH = 54;
  const barcodeX = ticketX + ticketW - barcodeW - 36;
  const barcodeY = stubContentY + 6;

  drawProceduralBarcode(
    ctx,
    barcodeX,
    barcodeY,
    barcodeW,
    barcodeH,
    data.ticketBarcode,
    palette.text
  );

  ctx.fillStyle = palette.textMuted;
  ctx.font = `bold 12px ${fontMono}`;
  ctx.textAlign = 'center';
  ctx.fillText(data.ticketBarcode, barcodeX + barcodeW / 2, barcodeY + barcodeH + 14);
}

// ---------------------------------------------------------------------------
// MAIN DISPATCHER
// ---------------------------------------------------------------------------

/**
 * Renders the HTML5 Canvas 2D Session Share Card as either a Champion Poster or Game Night Ticket.
 */
export async function renderSessionShareCard(
  data: SessionShareCardData,
  options: RenderShareCardOptions = {}
): Promise<Blob> {
  const themeKey = options.theme || 'dark';
  const style = options.style || 'poster';
  const palette = PALETTES[themeKey];

  // Wait for document fonts to be ready
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font loading fails
    }
  }

  // Choose image source for cover & atmospheric backdrop
  const primaryCoverUrl = data.coverUrl;
  const tablePhotoUrl = options.useTablePhoto && data.tablePhotoUrl ? data.tablePhotoUrl : undefined;

  // Load images in parallel with CORS safety
  const [coverImg, tablePhotoImg] = await Promise.all([
    loadCanvasImageSafe(primaryCoverUrl),
    tablePhotoUrl ? loadCanvasImageSafe(tablePhotoUrl) : Promise.resolve(null),
  ]);

  const backdropImg = tablePhotoImg || coverImg;

  // Extract dynamic accent color from cover art
  const extractedAccent = extractAccentColorFromImage(coverImg);
  const accentColor = extractedAccent || palette.accent;

  // Load player avatar images in parallel
  const avatarImagePromises: Array<Promise<{ key: string; img: HTMLImageElement | null }>> = [];

  const addAvatarLoad = (key: string, url?: string) => {
    if (url) {
      avatarImagePromises.push(loadCanvasImageSafe(url, 3000).then((img) => ({ key, img })));
    }
  };

  if (data.mode === 'points' && data.leaderboard) {
    for (const p of data.leaderboard) {
      addAvatarLoad(p.playerName, p.avatarUrl);
    }
  } else if (data.mode === 'win_only') {
    for (const p of data.winners || []) {
      addAvatarLoad(p.playerName, p.avatarUrl);
    }
    for (const p of data.otherPlayers || []) {
      addAvatarLoad(p.playerName, p.avatarUrl);
    }
  } else if (data.mode === 'coop') {
    for (const p of data.teamPlayers || []) {
      addAvatarLoad(p.playerName, p.avatarUrl);
    }
  }

  const loadedAvatars = await Promise.all(avatarImagePromises);
  const avatarImgMap = new Map<string, HTMLImageElement | null>();
  for (const item of loadedAvatars) {
    if (item.img) {
      avatarImgMap.set(item.key, item.img);
    }
  }

  // Canvas dimension calculation
  const width = 1080;
  const height =
    style === 'ticket'
      ? calculateTicketCanvasHeight(data)
      : calculatePosterCanvasHeight(data);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  if (style === 'ticket') {
    renderGameNightTicket(
      ctx,
      data,
      palette,
      accentColor,
      coverImg,
      avatarImgMap,
      width,
      height,
      themeKey
    );
  } else {
    renderChampionPoster(
      ctx,
      data,
      palette,
      accentColor,
      coverImg,
      backdropImg,
      avatarImgMap,
      width,
      height,
      themeKey
    );
  }

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
