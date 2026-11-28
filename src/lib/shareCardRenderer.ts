import { getMediaImage } from './mediaStorage';
import {
  buildProxiedImageUrl,
  SessionShareCardData,
  ShareCardPlayerAvatar,
} from './shareCard';
import { formatNumber } from './utils';

export interface RenderShareCardOptions {
  /** Use the first table photo rather than the game box when it is available. */
  useTablePhoto?: boolean;
}

const WIDTH = 1080;
const HEIGHT = 1350;

// Warm Archival Newsprint Palette
const PAPER = '#F6EFE1';
const PAPER_MAT = '#ECE3CF';
const PAPER_ROW_ALT = '#EFE6D3';
const INK = '#171412';
const INK_SOFT = '#332E28';
const MUTED = '#696256';
const RULE = '#BEB4A2';
const RULE_LIGHT = '#D5CBB8';
const RED = '#B3261E';
const GREEN = '#2B6843';
const AMBER = '#9A5B13';

// Editorial Typography Stack (full Vietnamese diacritics support)
const SERIF_DISPLAY = '"Playfair Display", Georgia, "Times New Roman", serif';
const SERIF_BODY = '"Newsreader", Georgia, "Times New Roman", serif';
const SANS = '"Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
const MONO = '"JetBrains Mono", "Be Vietnam Pro", monospace';
const VN_SAMPLE = 'Hằng Lộc Anh Huy ĂÂĐÊÔƠƯ ăâđêôơư 0123456789';

type ResultRow = {
  playerId: string;
  rank: string;
  name: string;
  avatar: ShareCardPlayerAvatar;
  score: string;
  gap?: string;
  note: string;
  isWinner: boolean;
};

type WinnerEntry = ShareCardPlayerAvatar & {
  playerId: string;
  playerName: string;
  scoreFormatted?: string;
  microTag?: string;
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
    const loadAll = Promise.all([
      document.fonts.load(`700 28px ${SERIF_DISPLAY}`, VN_SAMPLE),
      document.fonts.load(`800 36px ${SERIF_DISPLAY}`, VN_SAMPLE),
      document.fonts.load(`900 54px ${SERIF_DISPLAY}`, VN_SAMPLE),
      document.fonts.load(`400 18px ${SERIF_BODY}`, VN_SAMPLE),
      document.fonts.load(`italic 400 20px ${SERIF_BODY}`, VN_SAMPLE),
      document.fonts.load(`italic 600 18px ${SERIF_BODY}`, VN_SAMPLE),
      document.fonts.load(`600 18px ${SANS}`, VN_SAMPLE),
      document.fonts.load(`700 20px ${SANS}`, VN_SAMPLE),
      document.fonts.load(`600 14px ${MONO}`, VN_SAMPLE),
      document.fonts.load(`700 16px ${MONO}`, VN_SAMPLE),
    ]).then(() => document.fonts.ready);

    await Promise.race([
      loadAll,
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // Offline export gracefully falls back to system serif/sans fonts.
  }
}

function setFont(
  ctx: CanvasRenderingContext2D,
  weight: number,
  size: number,
  family = SANS,
  style: 'normal' | 'italic' = 'normal'
): void {
  ctx.font = `${style === 'italic' ? 'italic ' : ''}${weight} ${size}px ${family}`;
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

function doubleRule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  heavyTop = true,
  color = INK
): void {
  if (heavyTop) {
    rule(ctx, x1, y, x2, y, 2.5, color);
    rule(ctx, x1, y + 6, x2, y + 6, 1, color);
  } else {
    rule(ctx, x1, y, x2, y, 1, color);
    rule(ctx, x1, y + 6, x2, y + 6, 2.5, color);
  }
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

/**
 * Fits a centered Playfair Display front-page headline neatly into 1–3 lines
 * with generous line-height (1.14x) so Vietnamese diacritics never collide.
 */
function fitHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  maxWidth: number
): { size: number; lineHeight: number; lines: string[] } {
  const clean = headline.trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;

  // Prefer 2 lines at bold display scale; allow 3 lines for longer headlines.
  for (let size = 56; size >= 38; size -= 2) {
    setFont(ctx, 900, size, SERIF_DISPLAY);
    const maxLines = size >= 46 ? 2 : 3;
    const lines = wrap(ctx, clean, maxWidth, maxLines);
    const shownWords = lines.join(' ').replace(/…$/, '').split(/\s+/).filter(Boolean).length;
    if (shownWords >= wordCount) {
      return { size, lineHeight: Math.round(size * 1.15), lines };
    }
  }

  setFont(ctx, 900, 36, SERIF_DISPLAY);
  return { size: 36, lineHeight: 42, lines: wrap(ctx, clean, maxWidth, 3) };
}

function drawPaper(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle archival newsprint grain
  ctx.save();
  ctx.fillStyle = '#857A68';
  ctx.globalAlpha = 0.065;
  for (let y = 17; y < HEIGHT; y += 23) {
    for (let x = (y * 19) % 41; x < WIDTH; x += 43) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();

  // Outer editorial page border hair-line
  ctx.strokeStyle = RULE_LIGHT;
  ctx.lineWidth = 1;
  ctx.strokeRect(26, 26, WIDTH - 52, HEIGHT - 52);
}

/**
 * Draws the witness photograph or board game box cover cleanly:
 * - Landscape table photos / wide images fill the frame edge-to-edge (object-cover).
 * - Portrait or square game boxes render inside an archival mat with object-contain +
 *   soft drop shadow + mini Press Spec block on the side so box art is never cropped or awkward.
 */
function drawSmartImageFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  data: SessionShareCardData,
  useTablePhoto: boolean
): void {
  const inset = 6;
  const innerX = x + inset;
  const innerY = y + inset;
  const innerW = width - inset * 2;
  const innerH = height - inset * 2;

  ctx.fillStyle = PAPER_MAT;
  ctx.fillRect(x, y, width, height);

  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const ratio = image.naturalWidth / image.naturalHeight;
    const isWide = useTablePhoto || ratio >= 1.28;

    if (isWide) {
      // Full-bleed editorial photograph
      const scale = Math.max(innerW / image.naturalWidth, innerH / image.naturalHeight);
      const sourceW = innerW / scale;
      const sourceH = innerH / scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(innerX, innerY, innerW, innerH);
      ctx.clip();
      ctx.drawImage(
        image,
        (image.naturalWidth - sourceW) / 2,
        (image.naturalHeight - sourceH) / 2,
        sourceW,
        sourceH,
        innerX,
        innerY,
        innerW,
        innerH
      );
      ctx.restore();
    } else {
      // Portrait or square box cover: archival mat + full box art on left + press spec panel on right
      // Subtle woven mat texture lines
      ctx.save();
      ctx.strokeStyle = '#DDD3BE';
      ctx.lineWidth = 1;
      for (let gx = innerX + 12; gx < innerX + innerW; gx += 16) {
        rule(ctx, gx, innerY, gx, innerY + innerH, 1, '#E2D8C4');
      }
      ctx.restore();

      const pad = 18;
      const maxBoxW = Math.round(innerW * 0.52);
      const maxBoxH = innerH - pad * 2;
      const scale = Math.min(maxBoxW / image.naturalWidth, maxBoxH / image.naturalHeight);
      const drawW = Math.round(image.naturalWidth * scale);
      const drawH = Math.round(image.naturalHeight * scale);
      const boxX = innerX + pad + Math.round((maxBoxW - drawW) / 2);
      const boxY = innerY + Math.round((innerH - drawH) / 2);

      // Soft physical box drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(23, 20, 18, 0.28)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(boxX, boxY, drawW, drawH);
      ctx.restore();

      ctx.drawImage(image, boxX, boxY, drawW, drawH);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(boxX, boxY, drawW, drawH);

      // Mini Press Spec Card on the right side of the archival mat
      const specX = innerX + pad + maxBoxW + 18;
      const specW = innerX + innerW - specX - 16;
      const specTop = innerY + 24;

      rule(ctx, specX, specTop, specX + specW, specTop, 1.5, INK);
      ctx.fillStyle = RED;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      setFont(ctx, 700, 11, MONO);
      ctx.fillText('TABLE DOSSIER', specX, specTop + 10);

      ctx.fillStyle = INK;
      setFont(ctx, 800, 21, SERIF_DISPLAY);
      const titleLines = wrap(ctx, data.gameTitle, specW, 3);
      titleLines.forEach((line, idx) => {
        ctx.fillText(line, specX, specTop + 32 + idx * 25);
      });

      const metaStartY = specTop + 32 + titleLines.length * 25 + 14;
      rule(ctx, specX, metaStartY, specX + specW, metaStartY, 1, RULE);

      const metaRows: Array<[string, string]> = [
        ['ISSUE', data.playIndexFormatted],
        ['SEATS', data.playerCountFormatted],
        ['TIME', data.durationFormatted || 'Untimed'],
        [
          'RULE',
          data.mode === 'coop'
            ? 'Cooperative'
            : data.mode === 'win_only'
              ? 'Win / Loss'
              : data.lowestScoreWins
                ? 'Lowest Wins'
                : 'High Score',
        ],
      ];

      let my = metaStartY + 12;
      for (const [label, val] of metaRows) {
        if (my + 20 > innerY + innerH - 12) break;
        ctx.fillStyle = MUTED;
        setFont(ctx, 600, 10, MONO);
        ctx.textAlign = 'left';
        ctx.fillText(label, specX, my);

        ctx.fillStyle = INK_SOFT;
        setFont(ctx, 700, 12, SANS);
        ctx.textAlign = 'right';
        ctx.fillText(truncate(ctx, val, specW - 46), specX + specW, my - 1);
        my += 24;
      }
      ctx.textAlign = 'left';
    }
  } else {
    // Typographic editorial placeholder if no cover/photo is available
    ctx.fillStyle = '#E5DBC7';
    ctx.fillRect(innerX, innerY, innerW, innerH);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont(ctx, 800, 30, SERIF_DISPLAY);
    const lines = wrap(ctx, data.gameTitle, innerW - 48, 3);
    const totalH = lines.length * 36;
    lines.forEach((line, idx) => {
      ctx.fillText(line, innerX + innerW / 2, innerY + innerH / 2 - totalH / 2 + 18 + idx * 36);
    });
  }

  // Double archival border
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX, innerY, innerW, innerH);
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
  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const scale = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight);
    const sourceW = diameter / scale;
    const sourceH = diameter / scale;
    ctx.drawImage(
      image,
      (image.naturalWidth - sourceW) / 2,
      (image.naturalHeight - sourceH) / 2,
      sourceW,
      sourceH,
      x - radius,
      y - radius,
      diameter,
      diameter
    );
  } else {
    ctx.fillStyle = avatar.color || '#8D8170';
    ctx.fillRect(x - radius, y - radius, diameter, diameter);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (avatar.avatarEmoji) {
      ctx.font = `${Math.round(diameter * 0.5)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(avatar.avatarEmoji, x, y + Math.round(diameter * 0.03));
    } else {
      ctx.fillStyle = '#FFFFFF';
      setFont(ctx, 800, Math.round(diameter * 0.38), SANS);
      ctx.fillText(avatar.monogram || 'P', x, y + 1);
    }
  }
  ctx.restore();

  // Crisp paper halo + ink ring so overlapping avatars read cleanly
  ctx.beginPath();
  ctx.arc(x, y, radius + 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ringWidth;
  ctx.stroke();
}

function drawRubberStamp(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightEdgeX: number,
  centerY: number,
  maxWidth: number,
  color: string
): void {
  setFont(ctx, 700, 14, MONO);
  const label = truncate(ctx, text.toUpperCase(), maxWidth - 26);
  const textW = ctx.measureText(label).width;
  const width = Math.min(maxWidth, Math.max(106, Math.round(textW + 26)));
  const height = 30;
  const centerX = rightEdgeX - width / 2 - 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-0.065);
  ctx.fillStyle = 'rgba(246, 239, 225, 0.85)';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-width / 2, -height / 2, width, height);
  ctx.lineWidth = 0.85;
  ctx.strokeRect(-width / 2 + 3.5, -height / 2 + 3.5, width - 7, height - 7);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function getWinners(data: SessionShareCardData): WinnerEntry[] {
  if (data.resultStatus === 'pending') return [];
  if (data.mode === 'points') {
    return (data.leaderboard || [])
      .filter((player) => player.isWinner)
      .map((player) => ({
        ...player,
        scoreFormatted: player.scoreFormatted,
        microTag: player.microTag,
      }));
  }
  if (data.mode === 'win_only') {
    return (data.winners || []).map((player) => ({ ...player }));
  }
  return [];
}

function getRows(data: SessionShareCardData): ResultRow[] {
  const isPending = data.resultStatus === 'pending';

  if (data.mode === 'points') {
    const players = data.leaderboard || [];
    const lastRank = Math.max(...players.map((player) => player.rank), 1);
    return players.map((player) => ({
      playerId: player.playerId,
      rank: `#${player.rank}`,
      name: player.playerName,
      avatar: player,
      score: `${player.scoreFormatted} pts`,
      gap: player.gapFromLeaderText,
      note: isPending
        ? ''
        : player.isWinner
          ? 'WINNER'
          : player.rank === lastRank && lastRank > 1
            ? 'WOODEN SPOON'
            : '',
      isWinner: !isPending && player.isWinner,
    }));
  }

  if (data.mode === 'win_only') {
    return [
      ...(data.winners || []).map((player) => ({
        playerId: player.playerId,
        rank: '#1',
        name: player.playerName,
        avatar: player,
        score: isPending ? 'PENDING' : 'CROWN',
        note: isPending ? '' : 'WINNER',
        isWinner: !isPending,
      })),
      ...(data.otherPlayers || []).map((player, index) => ({
        playerId: player.playerId,
        rank: `#${index + 2}`,
        name: player.playerName,
        avatar: player,
        score: isPending ? 'PENDING' : 'PLAYED',
        note: '',
        isWinner: false,
      })),
    ];
  }

  const state = isPending ? 'PENDING' : data.coopOutcome === 'won' ? 'SURVIVED' : 'WIPED OUT';
  return (data.teamPlayers || []).map((player, index) => ({
    playerId: player.playerId,
    rank: `#${index + 1}`,
    name: player.playerName,
    avatar: player,
    score: state,
    note: '',
    isWinner: !isPending && data.coopOutcome === 'won',
  }));
}

function lookupAvatar(
  avatars: Map<string, HTMLImageElement | null>,
  playerId: string,
  playerName: string
): HTMLImageElement | null {
  return avatars.get(playerId) ?? avatars.get(playerName) ?? null;
}

function drawEarBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topLabel: string,
  bottomValue: string
): void {
  ctx.fillStyle = PAPER_MAT;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 0.75;
  ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = MUTED;
  setFont(ctx, 600, 10.5, MONO);
  ctx.fillText(truncate(ctx, topLabel.toUpperCase(), w - 18), x + w / 2, y + 21);

  ctx.fillStyle = INK;
  setFont(ctx, 700, 13.5, MONO);
  ctx.fillText(truncate(ctx, bottomValue.toUpperCase(), w - 18), x + w / 2, y + 43);
}

function drawLedgerRow(
  ctx: CanvasRenderingContext2D,
  row: ResultRow,
  avatars: Map<string, HTMLImageElement | null>,
  x: number,
  y: number,
  width: number,
  height: number,
  compact: boolean,
  altShade: boolean
): void {
  if (altShade) {
    ctx.fillStyle = PAPER_ROW_ALT;
    ctx.fillRect(x, y + 1, width, height - 2);
  }
  rule(ctx, x, y + height, x + width, y + height, 1, RULE_LIGHT);

  const midY = y + height / 2;
  const avatarSize = compact ? Math.min(32, height - 16) : Math.min(38, height - 14);

  // Rank
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = row.isWinner ? RED : MUTED;
  setFont(ctx, 700, compact ? 14 : 16, MONO);
  ctx.fillText(row.rank, x + 8, midY);

  // Avatar
  const avatarX = x + (compact ? 54 : 68);
  drawAvatar(ctx, lookupAvatar(avatars, row.playerId, row.name), row.avatar, avatarX, midY, avatarSize, 1.5);

  // Score (measure first so name never overlaps score)
  const scoreFontSize = compact ? 15 : 18;
  ctx.textAlign = 'right';
  const scoreDisplay = row.gap ? `${row.score} (${row.gap})` : row.score;
  setFont(ctx, 700, scoreFontSize, MONO);
  const maxScoreW = compact ? 168 : 260;
  const finalScoreText = truncate(ctx, scoreDisplay, maxScoreW);
  const measuredScoreW = ctx.measureText(finalScoreText).width;
  ctx.fillStyle = row.isWinner ? INK : INK_SOFT;
  ctx.fillText(finalScoreText, x + width - 8, midY);

  // Name (+ optional badge)
  const nameX = avatarX + avatarSize / 2 + 12;
  const rightBound = x + width - 16 - measuredScoreW;

  ctx.textAlign = 'left';
  if (!compact && row.note) {
    // Draw editorial note tag cleanly between name and score in wide 1-column mode
    setFont(ctx, 700, 11.5, MONO);
    const noteW = Math.min(138, ctx.measureText(row.note).width + 16);
    const noteX = rightBound - noteW - 14;
    const availNameW = Math.max(100, noteX - nameX - 12);

    ctx.fillStyle = INK;
    setFont(ctx, row.isWinner ? 800 : 600, 20, SANS);
    ctx.fillText(truncate(ctx, row.name, availNameW), nameX, midY);

    ctx.fillStyle = row.note === 'WINNER' ? RED : MUTED;
    setFont(ctx, 700, 11.5, MONO);
    ctx.textAlign = 'right';
    ctx.fillText(row.note, rightBound - 14, midY);
  } else {
    const availNameW = Math.max(70, rightBound - nameX - 8);
    ctx.fillStyle = INK;
    setFont(ctx, row.isWinner ? 800 : 600, compact ? 16 : 20, SANS);
    if (compact && row.note === 'WINNER') {
      // Compact subtle star prefix for winners in 2-col ledger
      ctx.fillText(truncate(ctx, `★ ${row.name}`, availNameW), nameX, midY);
    } else {
      ctx.fillText(truncate(ctx, row.name, availNameW), nameX, midY);
    }
  }
}

function renderBroadsheet(
  ctx: CanvasRenderingContext2D,
  data: SessionShareCardData,
  mainImage: HTMLImageElement | null,
  avatars: Map<string, HTMLImageElement | null>,
  useTablePhoto: boolean
): void {
  const margin = 56;
  const contentWidth = WIDTH - margin * 2; // 968
  drawPaper(ctx);

  // -------------------------------------------------------------------------
  // 1. CLASSIC BROADSHEET MASTHEAD + BALANCED EAR BOXES
  // -------------------------------------------------------------------------
  doubleRule(ctx, margin, 44, WIDTH - margin, true, INK);

  const earW = 178;
  const earH = 60;
  const earY = 60;
  drawEarBox(ctx, margin, earY, earW, earH, "HEO'S EDITION", data.playIndexFormatted);
  drawEarBox(
    ctx,
    WIDTH - margin - earW,
    earY,
    earW,
    earH,
    data.playerCountFormatted,
    data.durationFormatted || 'GAME LOG'
  );

  // Centered Newspaper Nameplate
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, 900, 52, SERIF_DISPLAY);
  ctx.fillText('THE SUNDAY TABLE', WIDTH / 2, 91);

  // Dateline strip
  rule(ctx, margin, 132, WIDTH - margin, 132, 1, RULE);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = MUTED;
  setFont(ctx, 600, 12, MONO);
  ctx.textAlign = 'left';
  ctx.fillText('BOARD GAME DISPATCH', margin, 149);

  ctx.fillStyle = INK;
  setFont(ctx, 700, 13, MONO);
  ctx.textAlign = 'center';
  ctx.fillText(data.dateFormatted.toUpperCase(), WIDTH / 2, 149);

  ctx.fillStyle = MUTED;
  setFont(ctx, 600, 12, MONO);
  ctx.textAlign = 'right';
  const venueLabel = (data.locationName || 'HOME TABLE').toUpperCase();
  ctx.fillText(truncate(ctx, venueLabel, 300), WIDTH - margin, 149);

  doubleRule(ctx, margin, 165, WIDTH - margin, false, INK);

  // -------------------------------------------------------------------------
  // 2. CENTERED KICKER, PLAYFAIR HEADLINE & NEWSREADER SUBHEAD
  // -------------------------------------------------------------------------
  let y = 194;
  const kickerColor =
    data.resultStatus === 'pending'
      ? AMBER
      : data.mode === 'coop' && data.coopOutcome === 'won'
        ? GREEN
        : RED;

  setFont(ctx, 700, 13, MONO);
  const kickerText = data.kicker.toUpperCase();
  const kickerW = ctx.measureText(kickerText).width;
  const flankW = 54;
  rule(ctx, WIDTH / 2 - kickerW / 2 - flankW - 14, y, WIDTH / 2 - kickerW / 2 - 14, y, 1.5, kickerColor);
  rule(ctx, WIDTH / 2 + kickerW / 2 + 14, y, WIDTH / 2 + kickerW / 2 + flankW + 14, y, 1.5, kickerColor);
  ctx.fillStyle = kickerColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kickerText, WIDTH / 2, y);

  y += 20;
  const headline = fitHeadline(ctx, data.headline, contentWidth - 28);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  setFont(ctx, 900, headline.size, SERIF_DISPLAY);
  headline.lines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, y + index * headline.lineHeight);
  });
  y += headline.lines.length * headline.lineHeight + 12;

  // Italic editorial subhead (deck)
  setFont(ctx, 400, 21, SERIF_BODY, 'italic');
  const subheadLines = wrap(ctx, data.subhead, contentWidth - 96, 2);
  ctx.fillStyle = INK_SOFT;
  subheadLines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, y + index * 27);
  });
  y += subheadLines.length * 27 + 18;

  rule(ctx, margin, y, WIDTH - margin, y, 1.5, INK);
  y += 22;

  // -------------------------------------------------------------------------
  // 3. TWO-COLUMN SPREAD WITH VERTICAL COLUMN RULE
  // -------------------------------------------------------------------------
  const heroTop = y;
  const photoX = margin;
  const photoW = 496;
  const photoH = 282;
  const colRuleX = photoX + photoW + 24; // 576
  const rightX = colRuleX + 24; // 600
  const rightW = WIDTH - margin - rightX; // 424
  const spreadH = 346;

  // Left Column: Smart Image Frame + Editorial Caption
  drawSmartImageFrame(ctx, mainImage, photoX, heroTop, photoW, photoH, data, useTablePhoto);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  setFont(ctx, 700, 19, SERIF_DISPLAY);
  ctx.fillText(truncate(ctx, data.gameTitle, photoW), photoX, heroTop + photoH + 12);

  ctx.fillStyle = MUTED;
  setFont(ctx, 400, 15.5, SERIF_BODY, 'italic');
  const captionParts = [
    useTablePhoto ? 'Fig. 1 — Table snapshot' : 'Fig. 1 — Edition cover',
    data.playerCountFormatted,
    data.durationFormatted,
  ].filter(Boolean);
  ctx.fillText(truncate(ctx, captionParts.join(' · '), photoW), photoX, heroTop + photoH + 38);

  // Crisp Vertical Newspaper Column Divider
  rule(ctx, colRuleX, heroTop, colRuleX, heroTop + spreadH, 1, RULE);

  // Right Column: Champion Dispatch + Rubber Stamp (zero overlap!)
  doubleRule(ctx, rightX, heroTop, rightX + rightW, true, INK);

  const stampColor =
    data.resultStatus === 'pending'
      ? AMBER
      : data.mode === 'coop' && data.coopOutcome === 'won'
        ? GREEN
        : RED;

  ctx.fillStyle = stampColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 700, 12, MONO);
  const deskTitle =
    data.resultStatus === 'pending'
      ? 'RECOUNT DESK'
      : data.mode === 'coop'
        ? 'TEAM DISPATCH'
        : 'CHAMPION DISPATCH';
  ctx.fillText(deskTitle, rightX, heroTop + 31);

  // Dedicated stamp band (heroTop + 14..48) — strictly above content at heroTop + 72
  drawRubberStamp(ctx, data.stamp, rightX + rightW, heroTop + 31, 186, stampColor);
  rule(ctx, rightX, heroTop + 56, rightX + rightW, heroTop + 56, 1, RULE_LIGHT);

  const dispatchBodyTop = heroTop + 72;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (data.resultStatus === 'pending') {
    ctx.fillStyle = INK;
    setFont(ctx, 800, 32, SERIF_DISPLAY);
    ctx.fillText('Score Recount', rightX, dispatchBodyTop + 14);
    ctx.fillText('In Progress', rightX, dispatchBodyTop + 54);

    ctx.fillStyle = MUTED;
    setFont(ctx, 400, 18.5, SERIF_BODY, 'italic');
    wrap(ctx, 'No winner is printed until every score at the table is confirmed.', rightW, 3).forEach(
      (line, index) => ctx.fillText(line, rightX, dispatchBodyTop + 114 + index * 26)
    );
  } else if (data.mode === 'coop') {
    const isWon = data.coopOutcome === 'won';
    ctx.fillStyle = isWon ? GREEN : RED;
    setFont(ctx, 900, 32, SERIF_DISPLAY);
    ctx.fillText(isWon ? 'Team Victory' : 'Team Defeat', rightX, dispatchBodyTop + 4);

    let teamCursorY = dispatchBodyTop + 50;
    if (data.teamScoreFormatted !== undefined) {
      ctx.fillStyle = INK;
      setFont(ctx, 900, 48, SERIF_DISPLAY);
      ctx.fillText(data.teamScoreFormatted, rightX, teamCursorY);
      const valW = ctx.measureText(data.teamScoreFormatted).width;
      ctx.fillStyle = MUTED;
      setFont(ctx, 700, 13, MONO);
      ctx.fillText('TEAM SCORE', rightX + valW + 12, teamCursorY + 30);
      teamCursorY += 66;
    }

    // Squad avatars strip
    const squad = (data.teamPlayers || []).slice(0, 6);
    if (squad.length > 0) {
      const avSize = 46;
      const step = Math.min(54, Math.floor((rightW - avSize) / Math.max(squad.length - 1, 1)));
      squad.forEach((member, idx) => {
        drawAvatar(
          ctx,
          lookupAvatar(avatars, member.playerId, member.playerName),
          member,
          rightX + avSize / 2 + idx * step,
          teamCursorY + avSize / 2 + 4,
          avSize,
          2
        );
      });
      teamCursorY += avSize + 18;
    }

    ctx.fillStyle = MUTED;
    setFont(ctx, 400, 16.5, SERIF_BODY, 'italic');
    ctx.fillText(
      truncate(
        ctx,
        isWon ? 'The squad lived to tell the tale.' : 'The post-match inquiry begins now.',
        rightW
      ),
      rightX,
      Math.min(teamCursorY, heroTop + 266)
    );
  } else {
    const winners = getWinners(data);
    if (winners.length > 1) {
      // Multi-winner / Shared Victory layout
      const shown = winners.slice(0, 4);
      const avSize = shown.length <= 2 ? 68 : 56;
      const step = avSize - 8;
      shown.forEach((w, idx) => {
        drawAvatar(
          ctx,
          lookupAvatar(avatars, w.playerId, w.playerName),
          w,
          rightX + avSize / 2 + idx * step,
          dispatchBodyTop + avSize / 2 + 4,
          avSize,
          2.5
        );
      });

      const textStartY = dispatchBodyTop + avSize + 20;
      ctx.fillStyle = MUTED;
      setFont(ctx, 700, 11.5, MONO);
      ctx.fillText(`${formatNumber(winners.length)} CO-CHAMPIONS`, rightX, textStartY);

      ctx.fillStyle = INK;
      setFont(ctx, 800, 26, SERIF_DISPLAY);
      const namesJoined = winners.map((w) => w.playerName).join(' & ');
      const nameLines = wrap(ctx, namesJoined, rightW, 2);
      nameLines.forEach((line, idx) => {
        ctx.fillText(line, rightX, textStartY + 18 + idx * 30);
      });

      const scoreY = textStartY + 18 + nameLines.length * 30 + 8;
      if (data.mode === 'points' && winners[0].scoreFormatted) {
        ctx.fillStyle = INK;
        setFont(ctx, 900, 38, SERIF_DISPLAY);
        ctx.fillText(winners[0].scoreFormatted, rightX, scoreY);
        const sW = ctx.measureText(winners[0].scoreFormatted).width;
        ctx.fillStyle = RED;
        setFont(ctx, 700, 14, MONO);
        ctx.fillText('PTS EACH', rightX + sW + 10, scoreY + 20);
      } else {
        ctx.fillStyle = MUTED;
        setFont(ctx, 600, 14, MONO);
        ctx.fillText('SHARED BRAGGING RIGHTS', rightX, scoreY + 6);
      }
    } else if (winners.length === 1) {
      // Classic Single Champion Spotlight — vertically balanced inside dispatch body
      const winner = winners[0];
      const bodyZoneH = heroTop + 304 - dispatchBodyTop; // ~232px
      const avSize = 114;
      const avCenterX = rightX + avSize / 2 + 4;
      const avCenterY = dispatchBodyTop + Math.round(bodyZoneH / 2) - 4;
      drawAvatar(
        ctx,
        lookupAvatar(avatars, winner.playerId, winner.playerName),
        winner,
        avCenterX,
        avCenterY,
        avSize,
        2.5
      );

      const infoX = rightX + avSize + 24;
      const infoW = rightW - avSize - 24;

      // Fit winner name cleanly in Playfair Display (auto-scales for longer Vietnamese names)
      let nameSize = 34;
      setFont(ctx, 800, nameSize, SERIF_DISPLAY);
      while (nameSize > 23 && ctx.measureText(winner.playerName).width > infoW) {
        nameSize -= 2;
        setFont(ctx, 800, nameSize, SERIF_DISPLAY);
      }
      const nameLines = wrap(ctx, winner.playerName, infoW, 2);
      const nameBlockH = nameLines.length * Math.round(nameSize * 1.12);
      const hasScore = data.mode === 'points' && Boolean(winner.scoreFormatted);
      const totalInfoH = 22 + nameBlockH + (hasScore ? 62 : 34) + (winner.microTag ? 24 : 0);
      const infoStartY = dispatchBodyTop + Math.max(12, Math.round((bodyZoneH - totalInfoH) / 2) - 4);

      ctx.fillStyle = MUTED;
      setFont(ctx, 700, 11.5, MONO);
      ctx.fillText(data.mode === 'win_only' ? 'TABLE WINNER' : 'TABLE CHAMPION', infoX, infoStartY);

      ctx.fillStyle = INK;
      setFont(ctx, 800, nameSize, SERIF_DISPLAY);
      nameLines.forEach((line, idx) => {
        ctx.fillText(line, infoX, infoStartY + 20 + idx * Math.round(nameSize * 1.12));
      });

      const afterNameY = infoStartY + 20 + nameBlockH + 8;
      if (hasScore && winner.scoreFormatted) {
        ctx.fillStyle = INK;
        setFont(ctx, 900, 52, SERIF_DISPLAY);
        ctx.fillText(winner.scoreFormatted, infoX, afterNameY);
        const scoreW = ctx.measureText(winner.scoreFormatted).width;
        ctx.fillStyle = RED;
        setFont(ctx, 700, 15, MONO);
        ctx.fillText('PTS', infoX + scoreW + 10, afterNameY + 32);

        if (winner.microTag) {
          ctx.fillStyle = MUTED;
          setFont(ctx, 400, 16, SERIF_BODY, 'italic');
          ctx.fillText(truncate(ctx, winner.microTag, infoW), infoX, afterNameY + 60);
        }
      } else {
        ctx.fillStyle = RED;
        setFont(ctx, 700, 15, MONO);
        ctx.fillText('BRAGGING RIGHTS', infoX, afterNameY + 8);
        ctx.fillStyle = MUTED;
        setFont(ctx, 400, 15.5, SERIF_BODY, 'italic');
        ctx.fillText(truncate(ctx, 'Official victory — no points tallied.', infoW), infoX, afterNameY + 34);
      }
    }
  }

  // Right Column Bottom Meta Strip
  rule(ctx, rightX, heroTop + 304, rightX + rightW, heroTop + 304, 1, INK);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = MUTED;
  setFont(ctx, 600, 12, MONO);
  ctx.textAlign = 'left';
  const leftMeta =
    data.resultStatus === 'pending'
      ? 'UNOFFICIAL RECORD'
      : data.mode === 'coop'
        ? `${formatNumber(data.teamPlayers?.length || 0)} PLAYERS`
        : data.winnerGameStreak
          ? `${formatNumber(data.winnerGameStreak)}-WIN STREAK`
          : data.lowestScoreWins
            ? 'LOW SCORE WINS'
            : 'OFFICIAL RESULT';
  ctx.fillText(leftMeta, rightX, heroTop + 326);

  ctx.textAlign = 'right';
  ctx.fillStyle = stampColor;
  setFont(ctx, 700, 12, MONO);
  ctx.fillText(truncate(ctx, data.calloutBadge, 210), rightX + rightW, heroTop + 326);

  // -------------------------------------------------------------------------
  // 4. OFFICIAL BOX SCORE LEDGER (1-COL FOR <= 4 PLAYERS, 2-COL FOR 5–8)
  // -------------------------------------------------------------------------
  const rows = getRows(data).slice(0, 8);
  const overflowCount =
    data.overflowPlayerCount ?? data.overflowOtherCount ?? data.overflowTeamCount ?? 0;

  const ledgerTop = heroTop + spreadH + 22;
  const footerRuleY = 1266;
  const overflowReserve = overflowCount > 0 ? 30 : 6;
  const rowsAreaTop = ledgerTop + 52;
  const rowsAreaBottom = footerRuleY - overflowReserve - 8;
  const availLedgerH = Math.max(120, rowsAreaBottom - rowsAreaTop);

  doubleRule(ctx, margin, ledgerTop, WIDTH - margin, true, INK);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  setFont(ctx, 800, 21, SERIF_DISPLAY);
  ctx.fillText(
    data.mode === 'coop' ? 'OFFICIAL SQUAD ROSTER' : 'OFFICIAL BOX SCORE',
    margin,
    ledgerTop + 28
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  setFont(ctx, 600, 12.5, MONO);
  const ledgerSubtitle =
    data.resultStatus === 'pending'
      ? 'UNOFFICIAL STANDINGS'
      : data.mode === 'coop' && data.teamScoreFormatted !== undefined
        ? `TEAM SCORE: ${data.teamScoreFormatted}`
        : `${data.playerCountFormatted.toUpperCase()} · FINAL STANDINGS`;
  ctx.fillText(ledgerSubtitle, WIDTH - margin, ledgerTop + 29);
  rule(ctx, margin, ledgerTop + 47, WIDTH - margin, ledgerTop + 47, 1, INK);

  const useTwoColumns = rows.length >= 5;
  let ledgerContentBottom = rowsAreaTop;

  if (useTwoColumns) {
    const leftCount = Math.ceil(rows.length / 2);
    const colGap = 36;
    const colW = (contentWidth - colGap) / 2; // 466
    const centerRuleX = margin + colW + colGap / 2; // 540
    const rowH = Math.max(46, Math.min(68, Math.floor(availLedgerH / leftCount)));

    // Crisp vertical column divider inside the 2-column ledger
    rule(ctx, centerRuleX, rowsAreaTop + 4, centerRuleX, rowsAreaTop + leftCount * rowH, 1, RULE);

    rows.forEach((row, index) => {
      const isRightCol = index >= leftCount;
      const colIndex = isRightCol ? index - leftCount : index;
      const rx = isRightCol ? centerRuleX + colGap / 2 : margin;
      const ry = rowsAreaTop + colIndex * rowH;
      drawLedgerRow(ctx, row, avatars, rx, ry, colW, rowH, true, colIndex % 2 === 1);
    });
    ledgerContentBottom = rowsAreaTop + leftCount * rowH;
  } else {
    const rowCount = Math.max(rows.length, 1);
    const maxSingleRowH = rowCount <= 2 ? 84 : 76;
    const rowH = Math.max(54, Math.min(maxSingleRowH, Math.floor(availLedgerH / rowCount)));
    rows.forEach((row, index) => {
      const ry = rowsAreaTop + index * rowH;
      drawLedgerRow(ctx, row, avatars, margin, ry, contentWidth, rowH, false, index % 2 === 1);
    });
    ledgerContentBottom = rowsAreaTop + rowCount * rowH;
  }

  // If fewer players leave generous space above the colophon, print a balanced
  // 3-column broadsheet Press Notes strip so the page feels composed end-to-end.
  const remainingGap = footerRuleY - overflowReserve - ledgerContentBottom;
  if (overflowCount === 0 && remainingGap >= 86) {
    const stripH = 66;
    const stripY = footerRuleY - stripH - 18;
    const colW = contentWidth / 3;

    ctx.fillStyle = PAPER_MAT;
    ctx.fillRect(margin, stripY, contentWidth, stripH);
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, stripY, contentWidth, stripH);

    rule(ctx, margin + colW, stripY + 10, margin + colW, stripY + stripH - 10, 1, RULE);
    rule(ctx, margin + colW * 2, stripY + 10, margin + colW * 2, stripY + stripH - 10, 1, RULE);

    const summaryCols: Array<{ label: string; value: string }> = [
      {
        label: 'EDITION & VENUE',
        value: data.locationName ? `${data.playIndexFormatted} · ${data.locationName}` : `${data.playIndexFormatted} · Home Table`,
      },
      {
        label: 'SCORING FORMAT',
        value:
          data.mode === 'coop'
            ? 'Cooperative Mission'
            : data.mode === 'win_only'
              ? 'Win / Loss Only'
              : data.lowestScoreWins
                ? 'Lowest Score Wins'
                : 'Highest Score Wins',
      },
      {
        label: 'MATCH VERDICT',
        value: data.calloutBadge,
      },
    ];

    summaryCols.forEach((item, idx) => {
      const cx = margin + idx * colW + colW / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = MUTED;
      setFont(ctx, 600, 10.5, MONO);
      ctx.fillText(item.label, cx, stripY + 22);

      ctx.fillStyle = idx === 2 ? stampColor : INK;
      setFont(ctx, 700, 15, idx === 2 ? MONO : SANS);
      ctx.fillText(truncate(ctx, item.value, colW - 26), cx, stripY + 45);
    });
  }

  if (overflowCount > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = MUTED;
    setFont(ctx, 400, 15, SERIF_BODY, 'italic');
    ctx.fillText(
      `Plus ${formatNumber(overflowCount)} additional ${overflowCount === 1 ? 'player' : 'players'} at the table`,
      WIDTH / 2,
      footerRuleY - 18
    );
  }

  // -------------------------------------------------------------------------
  // 5. CLEAN PRINT COLOPHON FOOTER (ZERO ISO TIMESTAMPS)
  // -------------------------------------------------------------------------
  doubleRule(ctx, margin, footerRuleY, WIDTH - margin, true, INK);
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  setFont(ctx, 700, 12.5, MONO);
  ctx.fillText('THE SUNDAY TABLE  ·  HEO COLLECTION', margin, 1300);

  ctx.textAlign = 'right';
  ctx.fillText(truncate(ctx, data.colophonText, 380), WIDTH - margin, 1300);
}

/** Renders the 1080 × 1350 print broadsheet Session Share Card ("The Sunday Table"). */
export async function renderSessionShareCard(
  data: SessionShareCardData,
  options: RenderShareCardOptions = {}
): Promise<Blob> {
  await ensureCanvasFonts();
  const useTablePhoto = Boolean(options.useTablePhoto && data.tablePhotoUrl);
  const primaryUrl = useTablePhoto ? data.tablePhotoUrl : data.coverUrl;

  const avatarRequests =
    data.mode === 'points'
      ? (data.leaderboard || []).map((player) => ({
          playerId: player.playerId,
          name: player.playerName,
          url: player.avatarUrl,
        }))
      : data.mode === 'win_only'
        ? [...(data.winners || []), ...(data.otherPlayers || [])].map((player) => ({
            playerId: player.playerId,
            name: player.playerName,
            url: player.avatarUrl,
          }))
        : (data.teamPlayers || []).map((player) => ({
            playerId: player.playerId,
            name: player.playerName,
            url: player.avatarUrl,
          }));

  const [mainImage, ...loadedAvatars] = await Promise.all([
    loadCanvasImageSafe(primaryUrl),
    ...avatarRequests.map(async (request) => ({
      playerId: request.playerId,
      name: request.name,
      image: request.url ? await loadCanvasImageSafe(request.url, 3000) : null,
    })),
  ]);

  // Key avatars by playerId first to avoid collisions when players share a name.
  const avatars = new Map<string, HTMLImageElement | null>();
  loadedAvatars.forEach((item) => {
    avatars.set(item.playerId, item.image);
    if (!avatars.has(item.name)) {
      avatars.set(item.name, item.image);
    }
  });

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  renderBroadsheet(ctx, data, mainImage, avatars, useTablePhoto);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create canvas PNG'));
    }, 'image/png');
  });
}
