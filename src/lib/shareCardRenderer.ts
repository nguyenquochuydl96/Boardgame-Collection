import { getMediaImage } from './mediaStorage';
import { SessionShareCardData, ShareCardPlayerAvatar, buildProxiedImageUrl } from './shareCard';

export type ShareCardTheme = 'dark' | 'light';

export interface RenderShareCardOptions {
  theme?: ShareCardTheme;
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
    bg: '#161311', // Deep Espresso
    cardBg: '#1D211B', // Dark Olive surface
    surface: '#272A24',
    surfaceAlt: '#32362E',
    surfaceHover: '#3C4236',
    border: 'rgba(250, 246, 238, 0.12)',
    borderLight: 'rgba(250, 246, 238, 0.24)',
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
    surfaceHover: '#DFD7C8',
    border: 'rgba(22, 19, 17, 0.12)',
    borderLight: 'rgba(22, 19, 17, 0.26)',
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
 * Draws a circular player avatar on the canvas with smooth clipping and border ring.
 * If player has an avatar image, draws center-cropped image; otherwise draws monogram or emoji.
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
    // Circle fill with user's tint
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
 * Calculates dynamic canvas height based on content to eliminate empty dark void at bottom.
 */
function calculateDynamicCanvasHeight(data: SessionShareCardData): number {
  const baseHeaderHeroH = 390;
  const baseFooterH = 120;

  let contentH = 350;

  if (data.mode === 'points') {
    const players = data.leaderboard || [];
    const count = players.length;
    if (count <= 1) {
      contentH = 150;
    } else {
      // #1 spotlight row: 96px + 12px gap
      // Runner-up rows: 74px + 10px gap = 84px each
      const runnerUpCount = Math.max(0, count - 1);
      contentH = 38 + 96 + 12 + runnerUpCount * 84;
      if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
        contentH += 44;
      }
    }
  } else if (data.mode === 'win_only') {
    const winners = data.winners || [];
    const winBoxH = winners.length > 1 ? 190 : 155;
    contentH = 38 + winBoxH + 34 + 130;
  } else if (data.mode === 'coop') {
    const bannerH = 130;
    const scoreH = data.teamScoreFormatted ? 94 : 0;
    const squadH = 130;
    contentH = 38 + bannerH + (scoreH ? scoreH + 24 : 0) + 34 + squadH;
  }

  const totalCalculated = baseHeaderHeroH + contentH + baseFooterH + 40;
  // Dynamic height clamped to comfortable bounds (never leaves huge blank space)
  return Math.max(980, Math.min(1600, totalCalculated));
}

/**
 * Renders the HTML5 Canvas 2D Session Share Card as a Warm Editorial Poster.
 * Dynamic height, atmospheric cover backdrop, real player avatars, and score bars.
 */
export async function renderSessionShareCard(
  data: SessionShareCardData,
  options: RenderShareCardOptions = {}
): Promise<Blob> {
  const themeKey = options.theme || 'dark';
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

  // Load player avatar images in parallel
  const avatarImagePromises: Array<Promise<{ key: string; img: HTMLImageElement | null }>> = [];

  const addAvatarLoad = (key: string, url?: string) => {
    if (url) {
      avatarImagePromises.push(
        loadCanvasImageSafe(url, 3000).then((img) => ({ key, img }))
      );
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

  // Dynamic canvas dimension calculation
  const width = 1080;
  const height = calculateDynamicCanvasHeight(data);

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
  const cardMargin = 40;
  const cardX = cardMargin;
  const cardY = cardMargin;
  const cardW = width - cardMargin * 2;
  const cardH = height - cardMargin * 2;
  const cardR = 28;

  ctx.save();
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();

  // Fill card background
  ctx.fillStyle = palette.cardBg;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // 3. Atmospheric Cover Backdrop (Safari / WebKit 100% compatible downscale blur)
  const backdropH = 430;
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
        ctx.globalAlpha = themeKey === 'dark' ? 0.35 : 0.22;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offCanvas, cardX, cardY, cardW, backdropH);
        ctx.restore();
      }
    } catch {
      // Non-fatal if offscreen canvas fails
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

  // Restore clip for inner content
  ctx.restore();

  // Draw card border
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // 4. Top Bar
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

  // 5. Hero Block
  const heroX = cardX + 36;
  const heroY = divY1 + 24;
  const coverW = 200;
  const coverH = 240;
  const coverR = 18;

  if (coverImg) {
    ctx.save();
    // Drop shadow behind box cover
    ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;

    drawRoundRect(ctx, heroX, heroY, coverW, coverH, coverR);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundRect(ctx, heroX, heroY, coverW, coverH, coverR);
    ctx.clip();

    const scale = Math.max(coverW / coverImg.naturalWidth, coverH / coverImg.naturalHeight);
    const sw = coverW / scale;
    const sh = coverH / scale;
    const sx = (coverImg.naturalWidth - sw) / 2;
    const sy = (coverImg.naturalHeight - sh) / 2;
    ctx.drawImage(coverImg, sx, sy, sw, sh, heroX, heroY, coverW, coverH);
    ctx.restore();

    // Border around cover
    drawRoundRect(ctx, heroX, heroY, coverW, coverH, coverR);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.borderLight;
    ctx.stroke();
  } else {
    // Editorial Monogram Frame
    drawRoundRect(ctx, heroX, heroY, coverW, coverH, coverR);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    // Inner subtle box
    drawRoundRect(ctx, heroX + 8, heroY + 8, coverW - 16, coverH - 16, coverR - 6);
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    // Monogram letters
    ctx.fillStyle = palette.accent;
    ctx.font = `italic bold 52px ${fontSerif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getMonogram(data.gameTitle), heroX + coverW / 2, heroY + coverH / 2);
  }

  // Right Content Box
  const textX = heroX + coverW + 34;
  const maxTitleW = cardW - 72 - coverW - 34;

  ctx.fillStyle = palette.text;
  ctx.font = `bold 50px ${fontSerif}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const titleLines = wrapText(ctx, data.gameTitle, maxTitleW, 2);
  const lineH = 58;
  let currentY = heroY + 8;
  for (const line of titleLines) {
    ctx.fillText(line, textX, currentY);
    currentY += lineH;
  }

  // Metadata pills row
  currentY = Math.max(currentY + 12, heroY + coverH - 52);
  const metaParts = [
    data.dateFormatted,
    data.locationName,
    data.durationFormatted,
    data.playerCountFormatted,
  ].filter(Boolean);

  ctx.fillStyle = palette.textMuted;
  ctx.font = `500 18px ${fontSans}`;
  ctx.textBaseline = 'top';
  ctx.fillText(metaParts.join('   ·   '), textX, currentY);

  // Hero divider
  const divY2 = heroY + coverH + 26;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, divY2);
  ctx.lineTo(cardX + cardW - 36, divY2);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 6. Main Result Block
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

    let currentCardY = rowStartY;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const isFirst = p.rank === 1;
      const rowH = isFirst ? 94 : 74;

      drawRoundRect(ctx, blockX, currentCardY, blockW, rowH, isFirst ? 20 : 16);

      if (isFirst) {
        ctx.fillStyle = palette.accentSoft;
        ctx.fill();
        ctx.lineWidth = 2;
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
      const badgeW = isFirst ? 42 : 36;
      const badgeH = isFirst ? 42 : 36;
      const badgeX = blockX + 16;
      const badgeY = currentCardY + (rowH - badgeH) / 2;

      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
      ctx.fillStyle = isFirst ? palette.accent : palette.surfaceAlt;
      ctx.fill();

      ctx.fillStyle = isFirst ? '#FFFFFF' : palette.textMuted;
      ctx.font = `bold ${isFirst ? 16 : 15}px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isFirst ? '👑' : `#${p.rank}`, badgeX + badgeW / 2, badgeY + badgeH / 2);

      // Avatar
      const avatarDiameter = isFirst ? 66 : 52;
      const avatarCx = badgeX + badgeW + 16 + avatarDiameter / 2;
      const avatarCy = currentCardY + rowH / 2;
      const pImg = avatarImgMap.get(p.playerName) || null;
      const ringColor = isFirst ? palette.accent : palette.borderLight;

      drawPlayerAvatarOnCanvas(
        ctx,
        pImg,
        p,
        avatarCx,
        avatarCy,
        avatarDiameter,
        ringColor,
        isFirst ? 2.5 : 1.5
      );

      // Name & details
      const infoX = avatarCx + avatarDiameter / 2 + 18;

      if (isFirst) {
        ctx.fillStyle = palette.text;
        ctx.font = `bold 26px ${fontSans}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(p.playerName, infoX, currentCardY + 22);

        // Micro-tag (e.g. "+32 pts margin" or "Photo Finish · +1 pt" or "Shared Victory")
        if (p.microTag) {
          const tagMetrics = ctx.measureText(p.microTag);
          const tagW = tagMetrics.width + 20;
          const tagH = 26;
          const tagY = currentCardY + 54;

          drawRoundRect(ctx, infoX, tagY, tagW, tagH, 8);
          ctx.fillStyle = palette.surface;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = palette.border;
          ctx.stroke();

          ctx.fillStyle = palette.accent;
          ctx.font = `bold 13px ${fontSans}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.microTag, infoX + tagW / 2, tagY + tagH / 2);
        }
      } else {
        ctx.fillStyle = palette.text;
        ctx.font = `600 22px ${fontSans}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(p.playerName, infoX, currentCardY + 16);

        // Proportional Score Bar
        const barW = 200;
        const barH = 6;
        const barY = currentCardY + 48;

        drawRoundRect(ctx, infoX, barY, barW, barH, 3);
        ctx.fillStyle = palette.border;
        ctx.fill();

        const fillW = Math.max(8, (barW * p.scorePercentage) / 100);
        drawRoundRect(ctx, infoX, barY, fillW, barH, 3);
        ctx.fillStyle = palette.accent;
        ctx.fill();
      }

      // Score
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      if (isFirst) {
        ctx.font = `bold 44px ${fontSans}`;
        ctx.fillStyle = palette.accent;
        ctx.fillText(p.scoreFormatted, blockX + blockW - 68, currentCardY + rowH / 2);
      } else {
        ctx.font = `bold 28px ${fontSans}`;
        ctx.fillStyle = palette.text;
        ctx.fillText(p.scoreFormatted, blockX + blockW - 68, currentCardY + rowH / 2);
      }

      // "pts" label
      ctx.font = `500 15px ${fontSans}`;
      ctx.fillStyle = palette.textMuted;
      ctx.fillText('pts', blockX + blockW - 20, currentCardY + rowH / 2 + 1);

      currentCardY += rowH + (isFirst ? 12 : 10);
    }

    if (data.overflowPlayerCount && data.overflowPlayerCount > 0) {
      ctx.fillStyle = palette.textMuted;
      ctx.font = `italic 16px ${fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `+${data.overflowPlayerCount} more players`,
        blockX + blockW / 2,
        currentCardY + 8
      );
    }
  } else if (data.mode === 'win_only') {
    // Header
    ctx.fillStyle = palette.textSubMuted;
    ctx.font = `bold 14px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MATCH RESULT', blockX, blockY);

    const winners = data.winners || [];
    const isMultiWinner = winners.length > 1;
    const winnerHeader = isMultiWinner ? '👑 WINNERS' : '👑 WINNER';

    const winBoxH = isMultiWinner ? 190 : 155;
    const startY = blockY + 28;

    drawRoundRect(ctx, blockX, startY, blockW, winBoxH, 22);
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
    ctx.fillText(winnerHeader, blockX + 28, startY + 20);

    // Winners row
    let wX = blockX + 28;
    const wY = startY + (isMultiWinner ? 105 : 90);

    for (const w of winners) {
      const pImg = avatarImgMap.get(w.playerName) || null;
      const avatarSize = 56;
      drawPlayerAvatarOnCanvas(
        ctx,
        pImg,
        w,
        wX + avatarSize / 2,
        wY,
        avatarSize,
        palette.accent,
        2.5
      );

      ctx.fillStyle = palette.text;
      ctx.font = `bold ${isMultiWinner ? 26 : 34}px ${fontSerif}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.playerName, wX + avatarSize + 16, wY);

      wX += avatarSize + ctx.measureText(w.playerName).width + 48;
      if (wX > blockX + blockW - 100) break;
    }

    // ALSO PLAYED Section
    const otherPlayers = data.otherPlayers || [];
    if (otherPlayers.length > 0) {
      const alsoY = startY + winBoxH + 34;
      ctx.fillStyle = palette.textSubMuted;
      ctx.font = `bold 14px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('ALSO PLAYED', blockX, alsoY);

      let pillX = blockX;
      let pillY = alsoY + 26;
      const pillGap = 12;
      const pillH = 50;

      for (const other of otherPlayers) {
        ctx.font = `500 18px ${fontSans}`;
        const textMetrics = ctx.measureText(other.playerName);
        const avatarSize = 34;
        const pW = avatarSize + textMetrics.width + 46;

        if (pillX + pW > blockX + blockW) {
          pillX = blockX;
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
          pillX + 14 + avatarSize / 2,
          pillY + pillH / 2,
          avatarSize,
          palette.borderLight,
          1.5
        );

        ctx.fillStyle = palette.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(other.playerName, pillX + 14 + avatarSize + 10, pillY + pillH / 2);

        pillX += pW + pillGap;
      }

      if (data.overflowOtherCount && data.overflowOtherCount > 0) {
        const moreText = `+${data.overflowOtherCount} more`;
        ctx.font = `500 16px ${fontSans}`;
        const mW = ctx.measureText(moreText).width + 32;
        if (pillX + mW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }
        drawRoundRect(ctx, pillX, pillY, mW, pillH, 16);
        ctx.fillStyle = palette.surfaceAlt;
        ctx.fill();
        ctx.fillStyle = palette.textMuted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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
      ctx.font = `bold 34px ${fontSans}`;
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
      let pillY = nextBlockY + 26;
      const pillGap = 12;
      const pillH = 50;

      for (const member of teamPlayers) {
        ctx.font = `500 18px ${fontSans}`;
        const textMetrics = ctx.measureText(member.playerName);
        const avatarSize = 34;
        const pW = avatarSize + textMetrics.width + 46;

        if (pillX + pW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }

        drawRoundRect(ctx, pillX, pillY, pW, pillH, 16);
        ctx.fillStyle = palette.surface;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.border;
        ctx.stroke();

        const pImg = avatarImgMap.get(member.playerName) || null;
        drawPlayerAvatarOnCanvas(
          ctx,
          pImg,
          member,
          pillX + 14 + avatarSize / 2,
          pillY + pillH / 2,
          avatarSize,
          palette.borderLight,
          1.5
        );

        ctx.fillStyle = palette.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(member.playerName, pillX + 14 + avatarSize + 10, pillY + pillH / 2);

        pillX += pW + pillGap;
      }

      if (data.overflowTeamCount && data.overflowTeamCount > 0) {
        const moreText = `+${data.overflowTeamCount} more`;
        ctx.font = `500 16px ${fontSans}`;
        const mW = ctx.measureText(moreText).width + 32;
        if (pillX + mW > blockX + blockW) {
          pillX = blockX;
          pillY += pillH + pillGap;
        }
        drawRoundRect(ctx, pillX, pillY, mW, pillH, 16);
        ctx.fillStyle = palette.surfaceAlt;
        ctx.fill();
        ctx.fillStyle = palette.textMuted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(moreText, pillX + mW / 2, pillY + pillH / 2);
      }
    }
  }

  // 7. Footer
  const footerY = cardY + cardH - 46;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, footerY - 18);
  ctx.lineTo(cardX + cardW - 36, footerY - 18);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = palette.textSubMuted;
  ctx.font = `500 15px ${fontSans}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEO — BOARD GAME COLLECTION', cardX + 36, footerY);

  ctx.textAlign = 'right';
  ctx.fillText(data.venueDateFormatted, cardX + cardW - 36, footerY);

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
