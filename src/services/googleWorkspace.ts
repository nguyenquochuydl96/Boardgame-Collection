import { BoardGame, CabinetType } from '../types/boardgame';
import { parseCsvRows } from './googleSheets';
import {
  findInBggCatalog,
  getGenerativeBoardGameBoxArt,
  cleanGameTitleForSearch,
} from './bggService';

export interface DriveSheetFile {
  id: string;
  name: string;
        'Condition',
  webViewLink?: string;
}

/**
 * Lists Google Sheets in the user's Google Drive
 */
        'Condition',
        'Condition',
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime%20desc&pageSize=25`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to load Google Drive files (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Fetches sheet metadata to avoid assuming 'Sheet1' as mandated by best practice
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
        'Condition',
): Promise<{ title: string; sheets: { title: string; sheetId: number }[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to access Google Sheet (HTTP ${res.status})`);
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => ({
    title: s.properties?.title || 'Sheet1',
    sheetId: s.properties?.sheetId || 0,
  }));

  return {
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets,
  };
}

/**
 * Normalizes header string for fuzzy column identification
 */
function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

        'Condition',
  const norm = normalizeHeader(header);
  if (norm.includes('tengame') || norm.includes('ten') || norm === 'name' || norm === 'title' || norm === 'boardgame') {
    return 'name';
  }
  if (
    norm.includes('status') ||
    norm.includes('onhand') ||
    norm.includes('oos') ||
    norm.includes('tinhtranghang') ||
    norm.includes('stock') ||
    (norm.includes('trangthai') && !norm.includes('tu') && !norm.includes('loai'))
  ) {
    return 'status';
  }
  if (
    norm === 'type' ||
    norm === 'loaigame' ||
    norm.includes('basegame') ||
    norm.includes('expansion') ||
    norm === 'gametype'
  ) {
    return 'gameType';
  }
  if (
    norm.includes('authenticity') ||
    norm.includes('authentic') ||
    norm.includes('realfake') ||
    norm.includes('chinhhang') ||
    norm.includes('replica') ||
    norm.includes('replicas') ||
    norm.includes('fake') ||
    norm.includes('inlau') ||
    norm.includes('bannhai') ||
    norm.includes('cabinet') ||
    (norm.includes('tu') && !norm.includes('tulam') && !norm.includes('tuoi'))
  ) {
    return 'cabinetType';
  }
  if (norm.includes('anh') || norm.includes('hinhanh') || norm.includes('image') || norm.includes('photo') || norm.includes('cover')) {
    return 'imageUrl';
  }
        'Players',
    return 'players';
  }
        'Playtime',
    return 'playtime';
  }
  if (norm.includes('theloai') || norm.includes('category') || norm.includes('genre')) {
    return 'category';
  }
  if (norm.includes('gia') || norm.includes('giatien') || norm.includes('price') || norm.includes('cost')) {
    return 'price';
  }
  if (norm.includes('nhaphathanh') || norm.includes('publisher') || norm.includes('hang')) {
    return 'publisher';
  }
  if (norm.includes('nam') || norm.includes('year')) {
    return 'year';
  }
  if (norm.includes('tinhtrang') || norm.includes('condition')) {
    return 'condition';
  }
  if (
    norm.includes('gameplay') ||
    norm.includes('boicanh') ||
    norm.includes('mota') ||
    norm.includes('cotruyen') ||
    norm.includes('noidung') ||
    norm.includes('description') ||
    norm.includes('story') ||
    norm.includes('lore') ||
        'Authenticity Notes',
  ) {
    return 'gameplayStory';
  }
  if (norm.includes('dauhieu') || norm.includes('ghichu') || norm.includes('notes') || norm.includes('nhanbiet')) {
    return 'authenticityNotes';
  }
  if (norm.includes('danhgia') || norm.includes('rating') || norm.includes('diem')) {
    return 'rating';
  }
  return 'unknown';
}

        'Condition',
  const norm = normalizeHeader(val);
  if (
    norm.includes('fake') ||
    norm.includes('replica') ||
    norm.includes('replicas') ||
    norm.includes('nhai') ||
    norm.includes('f1') ||
    norm.includes('rep') ||
    norm.includes('inlau') ||
    norm.includes('hangfake') ||
    norm.includes('bannhai') ||
    norm.includes('baninloi') ||
    norm.includes('copy') ||
    norm.includes('counterfeit') ||
    norm === '2' ||
    norm === 'f'
  ) {
    return 'fake';
  }
  return 'real';
}

function parseStatus(val: string): 'On Hand' | 'OOS' {
  const norm = normalizeHeader(val);
  if (
    norm.includes('oos') ||
    norm.includes('outofstock') ||
    norm.includes('hethang') ||
    norm.includes('soldout') ||
    norm.includes('het') ||
    norm.includes('tamhet') ||
    norm.includes('chayhang') ||
    norm.includes('daban') ||
    norm.includes('khongcosan')
  ) {
    return 'OOS';
  }
  return 'On Hand';
}

/**
 * Fetches values from Google Sheets API using OAuth access token
 */
export async function fetchSpreadsheetGamesViaApi(
  spreadsheetId: string,
  tabName: string,
        'Condition',
        'Condition',
  const range = encodeURIComponent(`${tabName}!A1:Z500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to read Google Sheet cells (HTTP ${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length < 2) {
    throw new Error(`Spreadsheet "${tabName}" contains no data rows.`);
  }

  const headers = rows[0];
  const colMap: Record<number, keyof BoardGame | 'cabinetType' | 'unknown'> = {};
  headers.forEach((h: any, idx: number) => {
    colMap[idx] = identifyColumn(String(h));
  });

  const games: BoardGame[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let name = '';
    let cabinetType: CabinetType = 'real' as CabinetType;
    let gameType: 'Base Game' | 'Expansion' = 'Base Game';
    let statusRaw = '';
    let status: 'On Hand' | 'OOS' = 'On Hand';
    let imageUrl = '';
    let players = '2 - 4 players';
    let playtime = '45 mins';
    let category = 'Strategy';
    let price = 500000;
    let publisher = 'Official Publisher';
    let year = 2023;
    let condition = 'Brand New (Sealed)';
    let gameplayStory = '';
    let authenticityNotes = '';
    let rating = 8.0;
    let hasExplicitRating = false;

    row.forEach((val: any, cIdx: number) => {
      if (val === undefined || val === null) return;
      const strVal = String(val).trim();
      const field = colMap[cIdx];

      if (field === 'name') name = strVal;
        'Condition',
      else if (field === 'gameType') {
        const normG = normalizeHeader(strVal);
        gameType = (normG.includes('expansion') || normG.includes('morong') || normG.includes('pack')) ? 'Expansion' : 'Base Game';
      }
      else if (field === 'status') {
        statusRaw = strVal;
        status = parseStatus(strVal);
      } else if (field === 'imageUrl') imageUrl = strVal;
      else if (field === 'players') players = strVal;
      else if (field === 'playtime') playtime = strVal;
      else if (field === 'category') category = strVal;
      else if (field === 'price') {
        const p = parseInt(strVal.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(p)) price = p;
      } else if (field === 'publisher') publisher = strVal;
      else if (field === 'year') {
        const y = parseInt(strVal, 10);
        if (!isNaN(y)) year = y;
      } else if (field === 'condition') {
        condition = strVal;
        'Condition',
      } else if (field === 'gameplayStory') gameplayStory = strVal;
      else if (field === 'authenticityNotes') {
        authenticityNotes = strVal;
        'Condition',
      } else if (field === 'rating') {
        const rt = parseFloat(strVal);
        if (!isNaN(rt) && rt > 0) {
          rating = rt;
          hasExplicitRating = true;
        }
      }
    });

    if (name) {
      // Discard header rows
      const normName = normalizeHeader(name);
      if (
        normName === 'name' ||
        normName === 'tengame' ||
        normName === 'ten' ||
        normName === 'title' ||
        normName === 'boardgame' ||
        normName === 'game' ||
        normName === 'authenticity' ||
        normName === 'currentstatus'
      ) {
        continue;
      }

      // 1. Cross-field fake detection
      const { isMarkedFake } = cleanGameTitleForSearch(name);
      const fakeKeywords = ['fake', 'nhai', 'rep', 'replica', 'f1', 'in lau', 'bootleg', 'copy', 'counterfeit'];
      const anyFieldFake =
        isMarkedFake ||
        fakeKeywords.some(
          (k) =>
            statusRaw.toLowerCase().includes(k) ||
            condition.toLowerCase().includes(k) ||
            authenticityNotes.toLowerCase().includes(k) ||
            category.toLowerCase().includes(k)
        );

      if (anyFieldFake || cabinetType === 'fake') {
        cabinetType = 'fake';
        if (condition === 'Brand New' || !condition) {
          condition = statusRaw && parseType(statusRaw) === 'fake' ? statusRaw : 'Replica / Fake Edition';
        }
        if (!authenticityNotes) {
          authenticityNotes = 'Non-official replica / bootleg copy without official publisher copyright.';
        }
      }

      // Auto-detect gameType if title specifies expansion
      if (
        gameType === 'Base Game' &&
        (normalizeHeader(name).includes('expansion') ||
          normalizeHeader(name).includes('morong') ||
          normalizeHeader(category).includes('expansion'))
      ) {
        gameType = 'Expansion';
      }

      // 2. Look up BoardGameGeek data based on game title
      const bggMatch = findInBggCatalog(name);
      const bggRating = bggMatch?.rating;
      const bggId = bggMatch?.bggId;
      const bggUrl = bggMatch?.bggUrl;

      const finalRating = (hasExplicitRating && rating > 0) ? rating : (bggRating ?? rating);

      // Auto-match cover image based on title
      let finalImageUrl = imageUrl;
      if (!finalImageUrl || finalImageUrl.trim().length === 0 || finalImageUrl.includes('Catan-2015-boxart.jpg')) {
        if (bggMatch && bggMatch.imageUrl) {
          finalImageUrl = bggMatch.imageUrl;
        } else {
          finalImageUrl = getGenerativeBoardGameBoxArt(name);
        }
      }

      const nums = players.match(/\d+/g);
      const min = nums ? parseInt(nums[0], 10) : (bggMatch?.minPlayers || 2);
      const max = nums && nums[1] ? parseInt(nums[1], 10) : (bggMatch?.maxPlayers || min);

      games.push({
        id: `google-sheet-${r}-${Date.now().toString(36)}`,
        name,
        cabinetType,
        gameType,
        status,
        imageUrl: finalImageUrl,
        players: players || (bggMatch ? `${bggMatch.minPlayers} - ${bggMatch.maxPlayers} players` : `${min} - ${max} players`),
        minPlayers: min,
        maxPlayers: max,
        playtime: playtime || (bggMatch ? ${bggMatch.playtimeMinutes} mins : '45 mins'),
        playtimeMinutes: parseInt(playtime, 10) || bggMatch?.playtimeMinutes || 45,
        category: category && category !== 'Strategy' ? category : (bggMatch?.category || category || 'Strategy'),
        price: price || (cabinetType === 'real' ? 850000 : 120000),
        publisher: publisher && publisher !== 'Unknown Publisher' ? publisher : (bggMatch?.publisher || 'Unknown Publisher'),
        year: year || bggMatch?.year || 2023,
        condition: condition || (cabinetType === 'real' ? 'Brand New (Sealed)' : 'Replica / Fake Edition'),
        gameplayStory:
          gameplayStory ||
          `Strategic board game experience with engaging tabletop mechanics and deep tactical decisions. Enjoy playing ${name}!`,
        authenticityNotes:
          authenticityNotes ||
          (cabinetType === 'real'
            ? 'Official authentic retail edition with verified components and publisher copyright.'
            : 'Counterfeit warning: Bootleg or reproduction without official publisher copyright.'),
        boxColor: cabinetType === 'real' ? '#b45309' : '#991b1b',
        rating: finalRating,
        bggRating: bggRating || finalRating,
        'Condition',
      });
    }
  }

  return { games, sheetTitle: spreadsheetId, tabName };
}

/**
 * Creates a brand new Google Sheet directly in user's Google Drive with full boardgame data!
 */
export async function createBoardgameSpreadsheetInDrive(
        'Condition',
  title: string,
  games: BoardGame[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet resource
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
      title: title || 'BoardGame Vault Collection (Real & Fake)',
      },
      sheets: [
        {
          properties: {
          title: 'Board Game Catalog',
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to create new Google Sheet file on Drive');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl;

  // 2. Populate values
  const headers = [
        'Game Title',
        'Cabinet Type (Real/Fake)',
        'Image URL',
        'Players',
        'Playtime',
        'Category',
        'Price (VND)',
        'Publisher',
        'Release Year',
        'Condition',
        'Authenticity Notes / Description',
        'BGG Rating',
  ];

  const valueRows = games.map((g) => [
    g.name,
    g.cabinetType === 'real' ? 'Real' : 'Fake',
    g.imageUrl,
    g.players,
    g.playtime,
    g.category,
    g.price,
    g.publisher,
    g.year,
    g.condition,
    g.authenticityNotes,
    g.rating,
  ]);

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Danh%20S%C3%A1ch%20BoardGame!A1?valueInputOption=USER_ENTERED`;
  await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: 'Board Game Catalog!A1',
      majorDimension: 'ROWS',
      values: [headers, ...valueRows],
    }),
  });

  return { spreadsheetId, spreadsheetUrl };
}
