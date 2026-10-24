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
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Lists Google Sheets in the user's Google Drive
 */
export async function listUserGoogleSheets(accessToken: string): Promise<DriveSheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime%20desc&pageSize=25`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Lỗi tải danh sách Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Fetches sheet metadata to avoid assuming 'Sheet1' as mandated by best practice
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: { title: string; sheetId: number }[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Lỗi truy cập Google Sheet (HTTP ${res.status})`);
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

function identifyColumn(header: string): keyof BoardGame | 'cabinetType' | 'unknown' {
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
  if (norm.includes('songuoi') || norm.includes('players') || norm.includes('nguoichoi')) {
    return 'players';
  }
  if (norm.includes('thoigian') || norm.includes('thoiluong') || norm.includes('playtime') || norm.includes('time')) {
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
    norm.includes('gioithieu')
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

function parseType(val: string): CabinetType {
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
  accessToken: string
): Promise<{ games: BoardGame[]; sheetTitle: string; tabName: string }> {
  const range = encodeURIComponent(`${tabName}!A1:Z500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Lỗi đọc ô tính Google Sheet (HTTP ${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length < 2) {
    throw new Error(`Bảng tính "${tabName}" không có dữ liệu hàng nào.`);
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
    let players = '2 - 4 người';
    let playtime = '45 phút';
    let category = 'Chiến thuật';
    let price = 500000;
    let publisher = 'Chưa rõ';
    let year = 2023;
    let condition = 'Mới 99%';
    let gameplayStory = '';
    let authenticityNotes = '';
    let rating = 8.0;
    let hasExplicitRating = false;

    row.forEach((val: any, cIdx: number) => {
      if (val === undefined || val === null) return;
      const strVal = String(val).trim();
      const field = colMap[cIdx];

      if (field === 'name') name = strVal;
      else if (field === 'cabinetType') cabinetType = parseType(strVal);
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
        if (parseType(strVal) === 'fake') cabinetType = 'fake';
      } else if (field === 'gameplayStory') gameplayStory = strVal;
      else if (field === 'authenticityNotes') {
        authenticityNotes = strVal;
        if (parseType(strVal) === 'fake') cabinetType = 'fake';
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
      const fakeKeywords = ['fake', 'nhai', 'nhái', 'rep', 'replica', 'f1', 'in lau', 'in lậu', 'bootleg', 'copy', 'bản nhái', 'hàng nhái', 'không bản quyền'];
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
        players: players || (bggMatch ? `${bggMatch.minPlayers} - ${bggMatch.maxPlayers} người` : `${min} - ${max} người`),
        minPlayers: min,
        maxPlayers: max,
        playtime: playtime || (bggMatch ? `${bggMatch.playtimeMinutes} phút` : '45 phút'),
        playtimeMinutes: parseInt(playtime, 10) || bggMatch?.playtimeMinutes || 45,
        category: category && category !== 'Chiến thuật' ? category : (bggMatch?.category || category || 'Chiến thuật'),
        price: price || (cabinetType === 'real' ? 850000 : 120000),
        publisher: publisher && publisher !== 'Chưa rõ' ? publisher : (bggMatch?.publisher || 'Chưa rõ'),
        year: year || bggMatch?.year || 2023,
        condition: condition || (cabinetType === 'real' ? 'Mới nguyên seal' : 'Bản Fake / Replica'),
        gameplayStory:
          gameplayStory ||
          `Trò chơi ${name} thuộc thể loại ${category || bggMatch?.category || 'chiến thuật'}, với lối chơi kịch tính và chiều sâu hấp dẫn.`,
        authenticityNotes:
          authenticityNotes ||
          (cabinetType === 'real'
            ? 'Sản phẩm chính hãng với tem kiểm định, chất liệu cao cấp.'
            : 'Dấu hiệu: Bản replica / in lậu không có bản quyền chính thức.'),
        boxColor: cabinetType === 'real' ? '#b45309' : '#991b1b',
        rating: finalRating,
        bggRating: bggRating || finalRating,
        addedDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  return { games, sheetTitle: spreadsheetId, tabName };
}

/**
 * Creates a brand new Google Sheet directly in user's Google Drive with full boardgame data!
 */
export async function createBoardgameSpreadsheetInDrive(
  accessToken: string,
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
        title: title || 'Bộ Sưu Tập BoardGame Vault (Real & Fake)',
      },
      sheets: [
        {
          properties: {
            title: 'Danh Sách BoardGame',
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể tạo file Google Sheet mới trên Drive');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl;

  // 2. Populate values
  const headers = [
    'Tên game',
    'Loại tủ (Real/Fake)',
    'Hình ảnh (URL)',
    'Số người chơi',
    'Thời gian chơi',
    'Thể loại',
    'Giá tiền (VND)',
    'Nhà phát hành',
    'Năm phát hành',
    'Tình trạng',
    'Dấu hiệu nhận biết / Ghi chú',
    'Đánh giá',
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
      range: 'Danh Sách BoardGame!A1',
      majorDimension: 'ROWS',
      values: [headers, ...valueRows],
    }),
  });

  return { spreadsheetId, spreadsheetUrl };
}
