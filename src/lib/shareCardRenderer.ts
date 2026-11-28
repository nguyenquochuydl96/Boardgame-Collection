import { getMediaImage } from './mediaStorage';
import {
  buildProxiedImageUrl,
  SessionShareCardData,
  ShareCardPlayerAvatar,
} from './shareCard';

export interface RenderShareCardOptions {
  /** Use the first table photo rather than the game box when it is available. */
  useTablePhoto?: boolean;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const PAPER = '#F7F1E3';
const INK = '#161311';
const MUTED = '#625D54';
const RULE = '#A9A194';
const RED = '#C62828';
const SANS = '"Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
const MONO = '"JetBrains Mono", "Be Vietnam Pro", monospace';

type ResultRow = {
  rank: string;
  name: string;
  avatar: ShareCardPlayerAvatar;
  score: string;
  note: string;
};

/** Load a canvas-safe image, resolving indexed media and proxying remote covers. */
export async function loadCanvasImageSafe(
  url?: string | null,
  timeoutMs = 4000
): Promise<HTMLImageElement | null> {
  if (!url?.trim()) return null;
  const source = url.trim();

  if (source.startsWith('idb://')) {
    try {
      const dataUrl = await getMediaImage(source);
      return dataUrl ? loadImage(dataUrl, timeoutMs) : null;
    } catch {
      return null;
    }
  }
  if (source.startsWith('data:') || source.startsWith('blob:') || source.startsWith('/')) {
    return loadImage(source, timeoutMs);
  }
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return (
      (await loadImage(buildProxiedImageUrl(source, 900), timeoutMs, true)) ||
      loadImage(source, 3000, true)
    );
  }
  return null;
}

function loadImage(src: string, timeoutMs: number, crossOrigin = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let complete = false;
    const finish = (result: HTMLImageElement | null) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    if (crossOrigin && !src.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

async function ensureCanvasFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${SANS}`),
      document.fonts.load(`600 16px ${SANS}`),
      document.fonts.load(`700 16px ${SANS}`),
      document.fonts.load(`800 16px ${SANS}`),
      document.fonts.load(`600 16px ${MONO}`),
      document.fonts.load(`700 16px ${MONO}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Offline export may fall back to a system sans font without failing the card.
  }
}

function font(ctx: CanvasRenderingContext2D, weight: number, size: number, family = SANS): void {
  ctx.font = `${weight} ${size}px ${family}`;
}

function rule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 1,
  color = RULE
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let output = '';
  for (const character of Array.from(text)) {
    if (ctx.measureText(`${output}${character}…`).width > maxWidth) break;
    output += character;
  }
  return output ? `${output}…` : '…';
}

function splitToken(ctx: CanvasRenderingContext2D, token: string, maxWidth: number): string[] {
  if (ctx.measureText(token).width <= maxWidth) return [token];
  const parts: string[] = [];
  let part = '';
  for (const character of Array.from(token)) {
    if (part && ctx.measureText(part + character).width > maxWidth) {
      parts.push(part);
      part = character;
    } else {
      part += character;
    }
  }
  if (part) parts.push(part);
  return parts;
}

function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/).flatMap((word) => splitToken(ctx, word, maxWidth));
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.join(' ').split(/\s+/).filter(Boolean).length < words.length && lines.length) {
    lines[lines.length - 1] = truncate(ctx, lines[lines.length - 1], maxWidth);
  }
  return lines;
}

function fitHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  maxWidth: number
): { size: number; lineHeight: number; lines: string[] } {
  const words = headline.trim().split(/\s+/).filter(Boolean).length;
  for (let size = 82; size >= 46; size -= 2) {
    font(ctx, 800, size);
    const lines = wrap(ctx, headline, maxWidth, 3);
    const shown = lines.join(' ').replace(/…$/, '').split(/\s+/).filter(Boolean).length;
    if (shown >= words) return { size, lineHeight: Math.round(size * 1.02), lines };
  }
  font(ctx, 800, 46);
  return { size: 46, lineHeight: 48, lines: wrap(ctx, headline, maxWidth, 3) };
}

function drawPaper(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.fillStyle = '#887F70';
  ctx.globalAlpha = 0.08;
  for (let y = 21; y < HEIGHT; y += 29) {
    for (let x = (y * 17) % 43; x < WIDTH; x += 47) ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function drawImageFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  fallback: string
): void {
  ctx.fillStyle = '#E7DECC';
  ctx.fillRect(x, y, width, height);
  if (image) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    ctx.drawImage(
      image,
      (image.naturalWidth - sourceWidth) / 2,
      (image.naturalHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height
    );
  } else {
    ctx.fillStyle = '#DED3BD';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(ctx, 800, 32);
    ctx.fillText(truncate(ctx, fallback.toUpperCase(), width - 44), x + width / 2, y + height / 2);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 7, y + 7, width - 14, height - 14);
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  avatar: ShareCardPlayerAvatar,
  x: number,
  y: number,
  diameter: number,
  ringWidth = 2
): void {
  const radius = diameter / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    const scale = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight);
    const sourceWidth = diameter / scale;
    const sourceHeight = diameter / scale;
    ctx.drawImage(
      image,
      (image.naturalWidth - sourceWidth) / 2,
      (image.naturalHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      x - radius,
      y - radius,
      diameter,
      diameter
    );
  } else {
    ctx.fillStyle = avatar.color || '#A39989';
    ctx.fillRect(x - radius, y - radius, diameter, diameter);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (avatar.avatarEmoji) {
      ctx.font = `${Math.round(diameter * 0.5)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(avatar.avatarEmoji, x, y + Math.round(diameter * 0.03));
    } else {
      ctx.fillStyle = '#FFFFFF';
      font(ctx, 800, Math.round(diameter * 0.38), SANS);
      ctx.fillText(avatar.monogram || 'P', x, y + 1);
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ringWidth;
  ctx.stroke();
}

function drawStamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number): void {
  font(ctx, 800, 17, MONO);
  const label = truncate(ctx, text.toUpperCase(), maxWidth - 24);
  const width = Math.min(maxWidth, ctx.measureText(label).width + 24);
  ctx.save();
  ctx.translate(x + width / 2, y + 18);
  ctx.rotate(-0.055);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.strokeRect(-width / 2, -18, width, 36);
  ctx.lineWidth = 1;
  ctx.strokeRect(-width / 2 + 4, -14, width - 8, 28);
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function getWinner(data: SessionShareCardData): (ShareCardPlayerAvatar & { playerName: string; scoreFormatted?: string }) | undefined {
  if (data.mode === 'points') return data.leaderboard?.find((player) => player.isWinner);
  if (data.mode === 'win_only') return data.winners?.[0];
  return data.teamPlayers?.[0];
}

function getRows(data: SessionShareCardData): ResultRow[] {
  if (data.mode === 'points') {
    const players = data.leaderboard || [];
    const lastRank = Math.max(...players.map((player) => player.rank), 1);
    return players.map((player) => ({
      rank: `#${player.rank}`,
      name: player.playerName,
      avatar: player,
      score: `${player.scoreFormatted} pts${player.gapFromLeaderText ? `  (${player.gapFromLeaderText})` : ''}`,
      note: player.isWinner ? 'WINNER' : player.rank === lastRank && lastRank > 1 ? 'WOODEN SPOON' : '',
    }));
  }
  if (data.mode === 'win_only') {
    return [
      ...(data.winners || []).map((player) => ({ rank: '#1', name: player.playerName, avatar: player, score: 'CROWN', note: 'WINNER' })),
      ...(data.otherPlayers || []).map((player, index) => ({ rank: `#${index + 2}`, name: player.playerName, avatar: player, score: 'PLAYED', note: '' })),
    ];
  }
  const state = data.coopOutcome === 'won' ? 'SURVIVED' : 'WIPED OUT';
  return (data.teamPlayers || []).map((player, index) => ({
    rank: `#${index + 1}`,
    name: player.playerName,
    avatar: player,
    score: state,
    note: '',
  }));
}

function renderBroadsheet(
  ctx: CanvasRenderingContext2D,
  data: SessionShareCardData,
  mainImage: HTMLImageElement | null,
  avatars: Map<string, HTMLImageElement | null>
): void {
  const margin = 60;
  const contentWidth = WIDTH - margin * 2;
  drawPaper(ctx);

  // Masthead
  rule(ctx, margin, 56, WIDTH - margin, 56, 2, INK);
  rule(ctx, margin, 64, WIDTH - margin, 64, 1, INK);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(ctx, 800, 47);
  ctx.fillText('THE TABLETOP CHRONICLE', WIDTH / 2, 107);
  font(ctx, 700, 15, MONO);
  ctx.textAlign = 'left';
  ctx.fillText('LATE NIGHT EDITION', margin, 149);
  ctx.textAlign = 'right';
  const issue = `${data.playIndexFormatted.toUpperCase()} · ${data.dateFormatted.toUpperCase()}${data.locationName ? ` · ${data.locationName.toUpperCase()}` : ''}`;
  ctx.fillText(truncate(ctx, issue, 560), WIDTH - margin, 149);
  rule(ctx, margin, 171, WIDTH - margin, 171, 2, INK);
  rule(ctx, margin, 179, WIDTH - margin, 179, 1, INK);

  // Hero headline: sequentially measured before placing later content.
  let y = 211;
  ctx.fillStyle = RED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  font(ctx, 800, 16, MONO);
  ctx.fillText(data.resultStatus === 'pending' ? 'BREAKING · RESULT PENDING' : 'GAME NIGHT FINAL', margin, y);
  y += 35;
  const headline = fitHeadline(ctx, data.headline, contentWidth);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  font(ctx, 800, headline.size);
  headline.lines.forEach((line, index) => ctx.fillText(line, margin, y + index * headline.lineHeight));
  y += headline.lines.length * headline.lineHeight + 30;
  rule(ctx, margin, y, WIDTH - margin, y, 1, INK);
  y += 26;

  // Witness photograph / game box
  const photoX = margin;
  const photoWidth = 500;
  const photoHeight = 262;
  const winnerX = photoX + photoWidth + 42;
  const winnerWidth = contentWidth - photoWidth - 42;
  const heroTop = y;
  drawImageFrame(ctx, mainImage, photoX, heroTop, photoWidth, photoHeight, data.gameTitle);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  font(ctx, 700, 20);
  ctx.fillText(truncate(ctx, `${data.gameTitle} · ${data.durationFormatted || '—'} · ${data.playerCountFormatted}`, photoWidth), photoX, heroTop + photoHeight + 14);
  ctx.fillStyle = MUTED;
  font(ctx, 600, 13, MONO);
  ctx.fillText(data.locationName ? `ON THE TABLE · ${data.locationName.toUpperCase()}` : 'ON THE TABLE', photoX, heroTop + photoHeight + 42);

  // Champion desk / pending recount panel
  rule(ctx, winnerX, heroTop, winnerX + winnerWidth, heroTop, 2, INK);
  rule(ctx, winnerX, heroTop + 8, winnerX + winnerWidth, heroTop + 8, 1, INK);
  ctx.fillStyle = RED;
  font(ctx, 800, 14, MONO);
  ctx.fillText(data.mode === 'coop' ? 'THE TEAM DESK' : 'CHAMPION DESK', winnerX, heroTop + 29);
  drawStamp(ctx, data.resultStatus === 'pending' ? 'RECOUNT' : data.stamp, winnerX + winnerWidth - 190, heroTop + 18, 190);

  if (data.resultStatus === 'pending') {
    ctx.fillStyle = INK;
    font(ctx, 800, 37);
    ctx.fillText('SCORE RECOUNT', winnerX, heroTop + 92);
    ctx.fillText('IN PROGRESS', winnerX, heroTop + 137);
    ctx.fillStyle = MUTED;
    font(ctx, 600, 19);
    wrap(ctx, 'No winner is printed until every score is confirmed.', winnerWidth, 3)
      .forEach((line, index) => ctx.fillText(line, winnerX, heroTop + 202 + index * 27));
  } else if (data.mode === 'coop') {
    ctx.fillStyle = INK;
    font(ctx, 800, 32);
    ctx.fillText(data.coopOutcome === 'won' ? 'TEAM VICTORY' : 'TEAM DEFEAT', winnerX, heroTop + 89);
    if (data.teamScoreFormatted !== undefined) {
      font(ctx, 700, 56, MONO);
      ctx.fillText(data.teamScoreFormatted, winnerX, heroTop + 144);
      const valueWidth = ctx.measureText(data.teamScoreFormatted).width;
      ctx.fillStyle = RED;
      font(ctx, 700, 15, MONO);
      ctx.fillText('TEAM SCORE', winnerX + valueWidth + 14, heroTop + 181);
    }
    ctx.fillStyle = MUTED;
    font(ctx, 600, 18);
    ctx.fillText(data.coopOutcome === 'won' ? 'The table lived to tell the tale.' : 'The post-match inquiry begins now.', winnerX, heroTop + 234);
  } else {
    const winner = getWinner(data);
    if (winner) {
      drawAvatar(ctx, avatars.get(winner.playerName) || null, winner, winnerX + 79, heroTop + 123, 126, 3);
      ctx.fillStyle = MUTED;
      font(ctx, 800, 13, MONO);
      ctx.fillText(data.mode === 'win_only' ? 'WINNER' : 'TABLE CHAMPION', winnerX + 164, heroTop + 74);
      ctx.fillStyle = INK;
      font(ctx, 800, 37);
      ctx.fillText(truncate(ctx, winner.playerName, winnerWidth - 164), winnerX + 164, heroTop + 100);
      if (data.mode === 'points' && winner.scoreFormatted) {
        font(ctx, 700, 58, MONO);
        ctx.fillText(winner.scoreFormatted, winnerX + 164, heroTop + 153);
        const scoreWidth = ctx.measureText(winner.scoreFormatted).width;
        ctx.fillStyle = RED;
        font(ctx, 700, 17, MONO);
        ctx.fillText('PTS', winnerX + 176 + scoreWidth, heroTop + 193);
      } else {
        ctx.fillStyle = MUTED;
        font(ctx, 700, 20, MONO);
        ctx.fillText('BRAGGING RIGHTS SECURED', winnerX + 164, heroTop + 170);
      }
    }
  }
  rule(ctx, winnerX, heroTop + 307, winnerX + winnerWidth, heroTop + 307, 1, INK);
  ctx.fillStyle = MUTED;
  font(ctx, 600, 14, MONO);
  const detail = data.mode === 'coop'
    ? `${data.teamPlayers?.length || 0} PLAYERS · ${data.coopOutcome === 'won' ? 'SURVIVED' : 'WIPED OUT'}`
    : data.lowestScoreWins ? 'LOW SCORE WINS' : data.winnerGameStreak ? `${data.winnerGameStreak}-WIN STREAK` : 'OFFICIAL RESULT';
  ctx.fillText(detail, winnerX, heroTop + 324);

  // The ledger has a dedicated fixed footer safe zone; row height adapts to content.
  const rows = getRows(data).slice(0, 8);
  const ledgerTop = heroTop + 363;
  const footerRuleY = 1265;
  const rowStart = ledgerTop + 55;
  const rowHeight = Math.max(30, Math.min(58, (footerRuleY - rowStart - 12) / Math.max(rows.length, 1)));
  rule(ctx, margin, ledgerTop, WIDTH - margin, ledgerTop, 2, INK);
  ctx.fillStyle = INK;
  font(ctx, 800, 20);
  ctx.fillText(data.mode === 'coop' ? 'TEAM WIRE' : 'RESULTS WIRE', margin, ledgerTop + 17);
  ctx.textAlign = 'right';
  if (data.mode === 'coop' && data.teamScoreFormatted !== undefined) {
    font(ctx, 700, 18, MONO);
    ctx.fillText(`TEAM SCORE: ${data.teamScoreFormatted}`, WIDTH - margin, ledgerTop + 18);
  } else {
    font(ctx, 600, 14, MONO);
    ctx.fillText('FINAL LEDGER', WIDTH - margin, ledgerTop + 21);
  }
  rule(ctx, margin, ledgerTop + 45, WIDTH - margin, ledgerTop + 45, 1, INK);

  rows.forEach((row, index) => {
    const rowY = rowStart + index * rowHeight;
    const avatarSize = Math.min(32, rowHeight - 12);
    rule(ctx, margin, rowY + rowHeight - 4, WIDTH - margin, rowY + rowHeight - 4, 1, RULE);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = row.note === 'WINNER' ? RED : MUTED;
    font(ctx, 700, 16, MONO);
    ctx.fillText(row.rank, margin, rowY + rowHeight / 2);
    drawAvatar(ctx, avatars.get(row.name) || null, row.avatar, margin + 65, rowY + rowHeight / 2, avatarSize, 1);
    ctx.fillStyle = INK;
    font(ctx, 700, Math.min(22, rowHeight - 18));
    ctx.fillText(truncate(ctx, row.name, 350), margin + 91, rowY + rowHeight / 2);
    if (row.note) {
      ctx.fillStyle = RED;
      font(ctx, 700, 12, MONO);
      ctx.fillText(truncate(ctx, row.note, 165), 540, rowY + rowHeight / 2);
    }
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    font(ctx, 700, Math.min(18, rowHeight - 19), MONO);
    ctx.fillText(truncate(ctx, row.score, 310), WIDTH - margin, rowY + rowHeight / 2);
  });

  rule(ctx, margin, footerRuleY, WIDTH - margin, footerRuleY, 2, INK);
  rule(ctx, margin, footerRuleY + 7, WIDTH - margin, footerRuleY + 7, 1, INK);
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  font(ctx, 700, 14, MONO);
  ctx.fillText('HEO TABLETOP ARCHIVE', margin, 1302);
  ctx.textAlign = 'right';
  ctx.fillText(truncate(ctx, data.ticketBarcode, 300), WIDTH - margin, 1302);
}

/** Renders the single 1080 × 1350 English broadsheet Session Share Card. */
export async function renderSessionShareCard(
  data: SessionShareCardData,
  options: RenderShareCardOptions = {}
): Promise<Blob> {
  await ensureCanvasFonts();
  const useTablePhoto = Boolean(options.useTablePhoto && data.tablePhotoUrl);
  const primaryUrl = useTablePhoto ? data.tablePhotoUrl : data.coverUrl;
  const avatarRequests = data.mode === 'points'
    ? (data.leaderboard || []).map((player) => ({ name: player.playerName, url: player.avatarUrl }))
    : data.mode === 'win_only'
      ? [...(data.winners || []), ...(data.otherPlayers || [])].map((player) => ({ name: player.playerName, url: player.avatarUrl }))
      : (data.teamPlayers || []).map((player) => ({ name: player.playerName, url: player.avatarUrl }));

  const [mainImage, ...loadedAvatars] = await Promise.all([
    loadCanvasImageSafe(primaryUrl),
    ...avatarRequests.map(async (request) => ({
      name: request.name,
      image: request.url ? await loadCanvasImageSafe(request.url, 3000) : null,
    })),
  ]);
  const avatars = new Map<string, HTMLImageElement | null>();
  loadedAvatars.forEach((item) => avatars.set(item.name, item.image));

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  renderBroadsheet(ctx, data, mainImage, avatars);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create canvas PNG'));
    }, 'image/png');
  });
}
