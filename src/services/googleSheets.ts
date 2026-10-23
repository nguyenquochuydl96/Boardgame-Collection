import { BoardGame, CabinetType } from '../types/boardgame';

export interface SheetParseResult {
  success: boolean;
  games: BoardGame[];
  error?: string;
  sourceType: 'gviz' | 'csv' | 'sample';
  rowCount: number;
}

// Sample Google Sheet URL for demo purposes
export const SAMPLE_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1iA_55rTj66iH_vA9T1aWbOqF-Z_0c4zL-demo/edit#gid=0';

/**
 * Extracts spreadsheet ID and optional GID from various Google Sheet URL styles
 */
export function parseGoogleSheetUrl(url: string): { sheetId: string | null; gid: string } {
  if (!url) return { sheetId: null, gid: '0' };

  // Check gid parameter
  let gid = '0';
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/i);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  // Check standard Google Sheet ID: /spreadsheets/d/([a-zA-Z0-9-_]+)
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (idMatch && idMatch[1]) {
    return { sheetId: idMatch[1], gid };
  }

  // Check published web link: /spreadsheets/d/e/([a-zA-Z0-9-_]+)
  const pubMatch = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/i);
  if (pubMatch && pubMatch[1]) {
    return { sheetId: pubMatch[1], gid };
  }

  return { sheetId: null, gid };
}

/**
 * Helper to normalize string for column header comparison
 */
function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese accents for fuzzy matching
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Maps a column name to a standard BoardGame field
 */
function identifyColumnField(header: string): keyof BoardGame | 'cabinetType' | 'unknown' {
  const norm = normalizeHeader(header);

  if (
    norm.includes('tengame') ||
    norm.includes('ten') ||
    norm === 'name' ||
    norm === 'title' ||
    norm === 'boardgame' ||
    norm === 'game'
  ) {
    return 'name';
  }

  if (
    norm.includes('loai') ||
    norm.includes('tu') ||
    norm.includes('phanloai') ||
    norm.includes('realfake') ||
    norm.includes('type') ||
    norm.includes('authentic') ||
    norm.includes('chinhhang') ||
    norm.includes('fake') ||
    norm.includes('trangthai')
  ) {
    return 'cabinetType';
  }

  if (
    norm.includes('anh') ||
    norm.includes('hinhanh') ||
    norm.includes('image') ||
    norm.includes('img') ||
    norm.includes('photo') ||
    norm.includes('cover') ||
    norm.includes('thumbnail') ||
    norm.includes('linkanh') ||
    norm.includes('picture')
  ) {
    return 'imageUrl';
  }

  if (
    norm.includes('songuoi') ||
    norm.includes('nguoichoi') ||
    norm.includes('players') ||
    norm.includes('playercount') ||
    norm.includes('songuoichoi')
  ) {
    return 'players';
  }

  if (
    norm.includes('thoigian') ||
    norm.includes('thoiluong') ||
    norm.includes('playtime') ||
    norm.includes('duration') ||
    norm.includes('phut') ||
    norm.includes('time')
  ) {
    return 'playtime';
  }

  if (
    norm.includes('theloai') ||
    norm.includes('danhmuc') ||
    norm.includes('category') ||
    norm.includes('genre') ||
    norm.includes('kieu')
  ) {
    return 'category';
  }

  if (
    norm.includes('gia') ||
    norm.includes('giatien') ||
    norm.includes('giamua') ||
    norm.includes('price') ||
    norm.includes('cost') ||
    norm.includes('tientrieu')
  ) {
    return 'price';
  }

  if (
    norm.includes('nhaphathanh') ||
    norm.includes('publisher') ||
    norm.includes('hang') ||
    norm.includes('tacgia') ||
    norm.includes('designer')
  ) {
    return 'publisher';
  }

  if (norm.includes('nam') || norm.includes('year') || norm.includes('phathanh')) {
    return 'year';
  }

  if (
    norm.includes('tinhtrang') ||
    norm.includes('condition') ||
    norm.includes('chatluong') ||
    norm.includes('dohoanthien')
  ) {
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

  if (
    norm.includes('dauhieu') ||
    norm.includes('ghichu') ||
    norm.includes('notes') ||
    norm.includes('nhanbiet') ||
    norm.includes('chitiet') ||
    norm.includes('lydofake') ||
    norm.includes('authenticnote')
  ) {
    return 'authenticityNotes';
  }

  if (
    norm.includes('danhgia') ||
    norm.includes('rating') ||
    norm.includes('score') ||
    norm.includes('diem')
  ) {
    return 'rating';
  }

  return 'unknown';
}

/**
 * Determines if a value indicates 'real' or 'fake'
 */
function parseCabinetType(val: string): CabinetType {
  const norm = normalizeHeader(val);
  if (
    norm.includes('fake') ||
    norm.includes('nhai') ||
    norm.includes('f1') ||
    norm.includes('rep') ||
    norm.includes('bootleg') ||
    norm.includes('khongbanquyen') ||
    norm.includes('inlau') ||
    norm === '2' ||
    norm === 'f'
  ) {
    return 'fake';
  }
  return 'real';
}

/**
 * Parses numeric price from string like "1.250.000 đ", "1250000", "$50"
 */
function parsePrice(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanStr = String(val).replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

/**
 * Parses number of players
 */
function parsePlayerCount(val: string): { min: number; max: number; text: string } {
  if (!val) return { min: 2, max: 4, text: '2 - 4 người' };
  const str = String(val).trim();
  const nums = str.match(/\d+/g);
  if (nums && nums.length >= 2) {
    return { min: parseInt(nums[0], 10), max: parseInt(nums[1], 10), text: str };
  } else if (nums && nums.length === 1) {
    const single = parseInt(nums[0], 10);
    return { min: single, max: single, text: `${single} người` };
  }
  return { min: 2, max: 4, text: str };
}

import { getSpreadsheetDetails, fetchSpreadsheetGamesViaApi } from './googleWorkspace';

/**
 * Fetch and parse data from Google Sheet using Google Sheets API (if authenticated) or Visualization API (gviz)
 */
export async function fetchFromGoogleSheet(
  url: string,
  accessToken?: string | null
): Promise<SheetParseResult> {
  const { sheetId, gid } = parseGoogleSheetUrl(url);

  if (!sheetId) {
    throw new Error('Link Google Sheet không hợp lệ. Vui lòng kiểm tra lại định dạng URL.');
  }

  // If user is authenticated with Google OAuth token, use the official Google Sheets API
  if (accessToken) {
    try {
      const details = await getSpreadsheetDetails(sheetId, accessToken);
      const tabName = details.sheets[0]?.title || 'Sheet1';
      const { games } = await fetchSpreadsheetGamesViaApi(sheetId, tabName, accessToken);
      return {
        success: true,
        games,
        sourceType: 'gviz',
        rowCount: games.length,
      };
    } catch (apiErr: any) {
      console.warn('Authenticated Sheets API call failed, falling back to public methods:', apiErr);
    }
  }

  // Attempt 1: Fetch via Google Visualization JSON API (built-in CORS support)
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

  try {
    const res = await fetch(gvizUrl, { headers: { Accept: 'text/plain,application/json' } });
    if (!res.ok) {
      throw new Error(`Google Sheet phản hồi lỗi HTTP ${res.status}`);
    }

    const text = await res.text();
    // Parse Google visualization wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);

      if (parsed.status === 'error') {
        throw new Error(parsed.errors?.[0]?.message || 'Không thể đọc dữ liệu Sheet. Hãy chắc chắn Sheet đã mở quyền "Bất kỳ ai có liên kết đều có thể xem".');
      }

      const table = parsed.table;
      if (!table || !table.rows || table.rows.length === 0) {
        throw new Error('Google Sheet trống hoặc không có dòng dữ liệu nào.');
      }

      // Column mapping
      const colMap: Record<number, keyof BoardGame | 'cabinetType' | 'unknown'> = {};
      table.cols.forEach((col: any, idx: number) => {
        const label = col.label || (table.rows[0]?.c?.[idx]?.v ? String(table.rows[0]?.c?.[idx]?.v) : `col_${idx}`);
        colMap[idx] = identifyColumnField(label);
      });

      // Check if row 0 was used as headers if labels were empty
      const hasLabels = table.cols.some((c: any) => c.label && c.label.trim().length > 0);
      const startRow = hasLabels ? 0 : 1;

      const games: BoardGame[] = [];

      for (let r = startRow; r < table.rows.length; r++) {
        const row = table.rows[r];
        if (!row || !row.c) continue;

        let name = '';
        let cabinetType: CabinetType = 'real';
        let imageUrl = '';
        let players = '2 - 4 người';
        let playtime = '30 - 60 phút';
        let category = 'Chiến thuật';
        let price = 500000;
        let publisher = 'Đang cập nhật';
        let year = new Date().getFullYear();
        let condition = 'Mới 99%';
        let gameplayStory = '';
        let authenticityNotes = '';
        let rating = 8.0;

        row.c.forEach((cell: any, cIdx: number) => {
          if (!cell || cell.v === null || cell.v === undefined) return;
          const val = String(cell.v).trim();
          const field = colMap[cIdx];

          if (field === 'name') name = val;
          else if (field === 'cabinetType') cabinetType = parseCabinetType(val);
          else if (field === 'imageUrl') imageUrl = val;
          else if (field === 'players') players = val;
          else if (field === 'playtime') playtime = val;
          else if (field === 'category') category = val;
          else if (field === 'price') price = parsePrice(val);
          else if (field === 'publisher') publisher = val;
          else if (field === 'year') {
            const y = parseInt(val, 10);
            if (!isNaN(y) && y > 1900 && y < 2050) year = y;
          } else if (field === 'condition') condition = val;
          else if (field === 'gameplayStory') gameplayStory = val;
          else if (field === 'authenticityNotes') authenticityNotes = val;
          else if (field === 'rating') {
            const num = parseFloat(val);
            if (!isNaN(num)) rating = Math.min(10, Math.max(1, num));
          }
        });

        if (name) {
          const { min, max } = parsePlayerCount(players);
          const color = cabinetType === 'real' ? '#0f766e' : '#b45309';

          games.push({
            id: `sheet-${r}-${Date.now().toString(36)}`,
            name,
            cabinetType,
            imageUrl: imageUrl || getFallbackImage(name, cabinetType),
            players: players || `${min} - ${max} người`,
            minPlayers: min,
            maxPlayers: max,
            playtime: playtime || '45 phút',
            playtimeMinutes: parseInt(playtime, 10) || 45,
            category: category || 'Chiến thuật',
            price: price || (cabinetType === 'real' ? 850000 : 120000),
            publisher: publisher || 'Chưa rõ',
            year: year || 2023,
            condition: condition || (cabinetType === 'real' ? 'Mới nguyên seal' : 'Bản in lỗi'),
            gameplayStory:
              gameplayStory ||
              `Trò chơi ${name} thuộc thể loại ${category || 'chiến thuật'}, phù hợp cho ${players || '2 - 4 người'} với những màn đấu trí kịch tính và hấp dẫn.`,
            authenticityNotes:
              authenticityNotes ||
              (cabinetType === 'real'
                ? 'Sản phẩm chính hãng với tem kiểm định, chất liệu cao cấp.'
                : 'Bản in nhái hoặc reprint không có bản quyền chính thức.'),
            boxColor: color,
            rating,
            addedDate: new Date().toISOString().split('T')[0],
          });
        }
      }

      if (games.length === 0) {
        throw new Error('Đã kết nối được tới Sheet nhưng không tìm thấy thông tin boardgame hợp lệ trong các cột.');
      }

      return {
        success: true,
        games,
        sourceType: 'gviz',
        rowCount: games.length,
      };
    }
  } catch (err: any) {
    // If gviz fails, try CSV export format
    return await fetchCsvFallback(sheetId, gid);
  }

  throw new Error('Không thể đồng bộ dữ liệu từ Google Sheet.');
}

/**
 * Fallback CSV export parser
 */
async function fetchCsvFallback(sheetId: string, gid: string): Promise<SheetParseResult> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(
      `Không thể tải CSV từ Google Sheet (HTTP ${res.status}). Vui lòng đảm bảo Sheet được cấu hình: Chia sẻ -> Bất kỳ ai có liên kết -> Người xem.`
    );
  }
  const csvText = await res.text();
  const games = parseCsvToGames(csvText);
  return {
    success: true,
    games,
    sourceType: 'csv',
    rowCount: games.length,
  };
}

/**
 * RFC-compliant CSV line parser handling quotes, commas, and newlines
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses raw CSV text into BoardGame array
 */
export function parseCsvToGames(csvText: string): BoardGame[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const colMap: Record<number, keyof BoardGame | 'cabinetType' | 'unknown'> = {};
  headers.forEach((h, idx) => {
    colMap[idx] = identifyColumnField(h);
  });

  const games: BoardGame[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    let name = '';
    let cabinetType: CabinetType = 'real';
    let imageUrl = '';
    let players = '2 - 4 người';
    let playtime = '45 phút';
    let category = 'Chiến thuật';
    let price = 500000;
    let publisher = 'Chưa rõ';
    let year = 2023;
    let condition = 'Mới';
    let gameplayStory = '';
    let authenticityNotes = '';
    let rating = 8.0;

    row.forEach((val, cIdx) => {
      const field = colMap[cIdx];
      if (!val) return;
      if (field === 'name') name = val;
      else if (field === 'cabinetType') cabinetType = parseCabinetType(val);
      else if (field === 'imageUrl') imageUrl = val;
      else if (field === 'players') players = val;
      else if (field === 'playtime') playtime = val;
      else if (field === 'category') category = val;
      else if (field === 'price') price = parsePrice(val);
      else if (field === 'publisher') publisher = val;
      else if (field === 'year') {
        const y = parseInt(val, 10);
        if (!isNaN(y)) year = y;
      } else if (field === 'condition') condition = val;
      else if (field === 'gameplayStory') gameplayStory = val;
      else if (field === 'authenticityNotes') authenticityNotes = val;
      else if (field === 'rating') {
        const num = parseFloat(val);
        if (!isNaN(num)) rating = num;
      }
    });

    if (name) {
      const { min, max } = parsePlayerCount(players);
      games.push({
        id: `csv-${r}-${Date.now().toString(36)}`,
        name,
        cabinetType,
        imageUrl: imageUrl || getFallbackImage(name, cabinetType),
        players: players || `${min} - ${max} người`,
        minPlayers: min,
        maxPlayers: max,
        playtime,
        playtimeMinutes: parseInt(playtime, 10) || 45,
        category,
        price,
        publisher,
        year,
        condition,
        gameplayStory:
          gameplayStory ||
          `Trò chơi ${name} thuộc thể loại ${category || 'chiến thuật'}, phù hợp cho ${players || '2 - 4 người'} với những màn đấu trí kịch tính và hấp dẫn.`,
        authenticityNotes,
        boxColor: cabinetType === 'real' ? '#0f766e' : '#991b1b',
        rating,
        addedDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  return games;
}

/**
 * Return a visually matching curated game cover image based on title
 */
export function getFallbackImage(title: string, type: CabinetType): string {
  const t = title.toLowerCase();
  if (t.includes('catan')) {
    return 'https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg';
  }
  if (t.includes('splendor')) {
    return 'https://upload.wikimedia.org/wikipedia/en/2/2e/BoardGameSplendorLogoFairUse.jpg';
  }
  if (t.includes('wingspan')) {
    return 'https://upload.wikimedia.org/wikipedia/en/c/c3/3d-wingspan-768x752.png';
  }
  if (t.includes('ticket') || t.includes('ride')) {
    return 'https://upload.wikimedia.org/wikipedia/en/9/92/Ticket_to_Ride_Board_Game_Box_EN.jpg';
  }
  if (t.includes('azul')) {
    return 'https://upload.wikimedia.org/wikipedia/en/2/23/Picture_of_Azul_game_box.jpg';
  }
  if (t.includes('mèo nổ') || t.includes('exploding') || t.includes('kitten')) {
    return 'https://upload.wikimedia.org/wikipedia/en/a/a6/Exploding_Kittens.png';
  }
  if (t.includes('carcassonne')) {
    return 'https://upload.wikimedia.org/wikipedia/en/5/5e/Carcassonne-game.jpg';
  }
  if (t.includes('bang')) {
    return 'https://upload.wikimedia.org/wikipedia/en/7/7b/Bang_box_art.jpg';
  }
  if (t.includes('hitler')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/8/89/Secret_Hitler.svg';
  }
  if (t.includes('dixit')) {
    return 'https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2021/11/Dixit-cover.png';
  }
  if (t.includes('uno')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/f/f9/UNO_Logo.svg';
  }
  if (t.includes('codenames')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Codenames_board_game.jpg';
  }
  if (t.includes('pandemic')) {
    return 'https://upload.wikimedia.org/wikipedia/en/3/36/Pandemic_game.jpg';
  }

  // Official fallback
  return 'https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg';
}

/**
 * Generates sample CSV template for users to copy/paste directly into Google Sheets
 */
export function generateSampleCsvContent(): string {
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

  const sampleRows = [
    [
      'Catan (Settlers of Catan)',
      'Real',
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
      '3 - 4 người',
      '75 phút',
      'Chiến thuật / Giao thương',
      '1250000',
      'KOSMOS',
      '1995',
      'Mới nguyên seal',
      'Hộp nén dày dặn ép vân linen, quân gỗ mịn màng, thẻ lõi đen chống soi',
      '8.8',
    ],
    [
      'Catan (Bản Nhái Trung Quốc)',
      'Fake',
      'https://images.unsplash.com/photo-1585503418537-88331351ad99?auto=format&fit=crop&w=800&q=80',
      '3 - 4 người',
      '75 phút',
      'Chiến thuật / Giao thương',
      '180000',
      'Hàng xưởng không tên',
      '2023',
      'Bản in lỗi',
      'Dấu hiệu fake: Hộp carton mỏng ọp ẹp, quân gỗ méo có dăm gai, thẻ mỏng dễ gãy gập',
      '4.2',
    ],
    [
      'Splendor',
      'Real',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
      '2 - 4 người',
      '30 phút',
      'Xây dựng engine',
      '950000',
      'Space Cowboys',
      '2014',
      'Likenew 99%',
      'Chip đá quý có lõi kim loại nặng 13.5g đầm tay, chữ in laser sắc nét',
      '8.5',
    ],
    [
      'Splendor (Token Nhựa Rỗng)',
      'Fake',
      'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=800&q=80',
      '2 - 4 người',
      '30 phút',
      'Xây dựng engine',
      '135000',
      'Shopee F1',
      '2022',
      'Đã chơi vài lần',
      'Dấu hiệu fake: Chip nhựa rỗng siêu nhẹ chỉ 4.5g, thẻ bài trơn bóng không cán màng UV',
      '5.0',
    ],
    [
      'The Resistance: Avalon',
      'Real',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      '5 - 10 người',
      '30 phút',
      'Ẩn vai / Suy luận',
      '480000',
      'Indie Boards & Cards',
      '2012',
      'Mới 99%',
      'Lưng thẻ bài đồng màu tuyệt đối, bìa thẻ nhân vật dày 2mm',
      '8.9',
    ],
    [
      'The Resistance: Avalon (Bản In Lỗi)',
      'Fake',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      '5 - 10 người',
      '30 phút',
      'Ẩn vai / Suy luận',
      '49000',
      'In lậu',
      '2021',
      'Hộp cũ xước',
      'Dấu hiệu fake: Lưng lá bài Merlin lệch tone màu xanh, lộ vai trò ngay khi chia bài',
      '3.8',
    ],
  ];

  const escapeCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  return [
    headers.map(escapeCell).join(','),
    ...sampleRows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');
}

/**
 * Exports current games collection to downloadable CSV string
 */
export function exportGamesToCsv(games: BoardGame[]): string {
  const headers = [
    'Tên game',
    'Tủ (Real/Fake)',
    'Hình ảnh (URL)',
    'Số người chơi',
    'Thời gian',
    'Thể loại',
    'Giá (VND)',
    'Nhà phát hành',
    'Năm',
    'Tình trạng',
    'Ghi chú / Dấu hiệu nhận biết',
    'Đánh giá',
  ];

  const escapeCell = (cell: any) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = games.map((g) => [
    escapeCell(g.name),
    escapeCell(g.cabinetType === 'real' ? 'Real' : 'Fake'),
    escapeCell(g.imageUrl),
    escapeCell(g.players),
    escapeCell(g.playtime),
    escapeCell(g.category),
    escapeCell(g.price),
    escapeCell(g.publisher),
    escapeCell(g.year),
    escapeCell(g.condition),
    escapeCell(g.authenticityNotes),
    escapeCell(g.rating),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
