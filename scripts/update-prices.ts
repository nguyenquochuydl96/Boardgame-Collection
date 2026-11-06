import { createGameCoverDataUri } from '../src/lib/utils';

interface TableEntry {
  name: string;
  id?: string;
  bggId?: string;
  authenticity: 'Real' | 'Fake';
  price: number;
  status: 'own' | 'previously_owned';
}

const TABLE_DATA: TableEntry[] = [
  { name: 'Iron Clays 200', authenticity: 'Real', price: 1800000, status: 'own' },
  { name: 'Brass: Birmingham', id: 'bgg-224517', authenticity: 'Real', price: 1300000, status: 'own' },
  { name: 'Codenames: Pictures', id: 'bgg-198773', authenticity: 'Fake', price: 140000, status: 'own' },
  { name: 'Critter Kitchen', id: 'bgg-393429', authenticity: 'Real', price: 1200000, status: 'own' },
  { name: "Darwin's Journey", id: 'bgg-322289', authenticity: 'Real', price: 1300000, status: 'own' },
  { name: 'Deep Sea Adventure', id: 'bgg-169654', authenticity: 'Fake', price: 60000, status: 'own' },
  { name: 'Dokojong', id: 'bgg-330401', authenticity: 'Fake', price: 99000, status: 'own' },
  { name: 'Dune: Imperium – Uprising', id: 'bgg-397598', authenticity: 'Real', price: 1400000, status: 'own' },
  { name: 'Durian', id: 'bgg-307963', authenticity: 'Fake', price: 124000, status: 'own' },
  { name: 'Faraway', id: 'bgg-385761', authenticity: 'Fake', price: 150000, status: 'own' },
  { name: 'Flip 7: With A Vengeance', id: 'bgg-463441', authenticity: 'Fake', price: 44000, status: 'own' },
  { name: 'FlipToons', id: 'bgg-449185', authenticity: 'Fake', price: 125000, status: 'own' },
  { name: 'Fort', id: 'bgg-296912', authenticity: 'Real', price: 750000, status: 'previously_owned' },
  { name: 'Great Western Trail: Second Edition', id: 'bgg-341169', authenticity: 'Real', price: 1400000, status: 'own' },
  { name: 'Keep the Heroes Out!', id: 'bgg-333255', authenticity: 'Real', price: 3000000, status: 'previously_owned' },
  { name: 'Long Shot: The Dice Game', id: 'bgg-295374', authenticity: 'Real', price: 550000, status: 'own' },
  { name: 'Love Letter', id: 'bgg-277085', authenticity: 'Fake', price: 69000, status: 'own' },
  { name: 'Marvel United', id: 'bgg-298047', authenticity: 'Real', price: 850000, status: 'previously_owned' },
  { name: 'Marvel United: X-Men', id: 'bgg-336382', authenticity: 'Real', price: 900000, status: 'previously_owned' },
  { name: 'Maskmen', id: 'bgg-159581', authenticity: 'Fake', price: 45000, status: 'own' },
  { name: 'Mind MGMT: The Psychic Espionage "Game." + Upgrade Kit', id: 'bgg-284653', authenticity: 'Real', price: 900000, status: 'own' },
  { name: 'Modern Art', id: 'bgg-118', authenticity: 'Real', price: 800000, status: 'own' },
  { name: 'Phase 10', id: 'bgg-1258', authenticity: 'Fake', price: 20000, status: 'own' },
  { name: 'Rising Sun', id: 'bgg-205896', authenticity: 'Real', price: 3500000, status: 'previously_owned' },
  { name: 'Saboteur', id: 'bgg-9220', authenticity: 'Fake', price: 75000, status: 'own' },
  { name: 'Sail', id: 'bgg-377470', authenticity: 'Fake', price: 119000, status: 'own' },
  { name: 'SCOUT', id: 'bgg-291453', authenticity: 'Fake', price: 152000, status: 'own' },
  { name: 'Secret Hitler', id: 'bgg-188834', authenticity: 'Fake', price: 218000, status: 'own' },
  { name: 'Slay the Spire: The Board Game', id: 'bgg-338960', authenticity: 'Real', price: 2800000, status: 'previously_owned' },
  { name: 'Skull', id: 'bgg-92415', authenticity: 'Fake', price: 158000, status: 'own' },
  { name: 'Spirit Island', id: 'bgg-162886', authenticity: 'Real', price: 1600000, status: 'own' },
  { name: 'Splendor Duel', id: 'bgg-364073', authenticity: 'Fake', price: 146000, status: 'own' },
  { name: 'Stardew Valley: The Board Game', id: 'bgg-332290', authenticity: 'Real', price: 2240000, status: 'previously_owned' },
  { name: 'Startups', id: 'bgg-223770', authenticity: 'Fake', price: 99000, status: 'own' },
  { name: 'Tiletum', id: 'bgg-351913', authenticity: 'Real', price: 900000, status: 'own' },
  { name: 'Tiny Towns', id: 'bgg-265736', authenticity: 'Real', price: 1100000, status: 'own' },
  { name: 'The White Castle', id: 'bgg-371942', authenticity: 'Real', price: 1080000, status: 'own' },
  { name: 'Waka Tanka', id: 'bgg-178361', authenticity: 'Real', price: 400000, status: 'own' },
  { name: 'Zoo Vadis', id: 'bgg-368061', authenticity: 'Real', price: 1000000, status: 'own' },
];

async function run() {
  const url = 'https://xxwdasgmfrseisbcarza.supabase.co/rest/v1/vaults?vault_id=eq.huy-vault-2026&select=*';
  const anonKey = 'sb_publishable_exmu-e2HUcITKdY02X-P6Q_BeX0v3z0';

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) {
    console.error('Fetch failed:', res.status, await res.text());
    process.exit(1);
  }

  const rows = await res.json();
  const vaultRow = rows[0];
  const games: any[] = [...(vaultRow.games || [])];

  console.log(`Initial games count in Supabase: ${games.length}`);

  let updatedCount = 0;

  for (const entry of TABLE_DATA) {
    let existingIndex = -1;
    if (entry.id) {
      existingIndex = games.findIndex((g) => g.id === entry.id);
    }
    if (existingIndex === -1) {
      // Find by matching name
      existingIndex = games.findIndex(
        (g) =>
          g.name.toLowerCase() === entry.name.toLowerCase() ||
          (entry.name.includes('Mind MGMT') && g.name.includes('Mind MGMT'))
      );
    }

    if (existingIndex !== -1) {
      const g = games[existingIndex];
      const prevPrice = g.purchasePrice;
      const prevStatus = g.status;
      g.purchasePrice = entry.price;
      g.status = entry.status;
      console.log(
        `[UPDATED] ${g.name} (id: ${g.id}): price ${prevPrice} -> ${entry.price}, status: ${prevStatus} -> ${entry.status}`
      );
      updatedCount++;
    } else {
      if (entry.name === 'Iron Clays 200') {
        const cover = createGameCoverDataUri(
          'Iron Clays 200',
          'Gaming Counters · Roxley',
          ['#1e293b', '#334155', '#e2e8f0'],
          'hex'
        );
        const newGame = {
          id: 'custom-iron-clays-200',
          bggId: 'custom-iron-clays-200',
          name: 'Iron Clays 200',
          thumbnail: cover,
          image: cover,
          description:
            'Iron Clays 200 printed gaming counters and bank chips by Roxley Games, crafted for heavy economic games, 18xx, and tabletop titles.',
          minPlayers: 2,
          maxPlayers: 8,
          playingTime: 60,
          yearPublished: 2019,
          bggRating: 8.5,
          status: 'own',
          purchasePrice: 1800000,
          addedDate: new Date().toISOString(),
          notes: 'Authentic Roxley Iron Clays 200 bank set.',
          tags: ['Accessory', 'Poker Chips', 'Economic'],
        };
        games.push(newGame);
        console.log(`[ADDED] ${newGame.name}: price 1,800,000, status: own`);
        updatedCount++;
      } else {
        console.warn(`[NOT FOUND] ${entry.name}`);
      }
    }
  }

  console.log(`Total table items processed: ${updatedCount} / ${TABLE_DATA.length}`);
  console.log(`Total games in vault now: ${games.length}`);

  const ownedGames = games.filter((g) => g.status === 'own');
  const totalOwnedValue = ownedGames.reduce((sum, g) => sum + (g.purchasePrice || 0), 0);
  console.log(`Total owned games: ${ownedGames.length}`);
  console.log(`Total owned collection value: ${totalOwnedValue.toLocaleString()} VND`);

  const patchUrl = 'https://xxwdasgmfrseisbcarza.supabase.co/rest/v1/vaults?vault_id=eq.huy-vault-2026';
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      games,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!patchRes.ok) {
    console.error('PATCH failed:', patchRes.status, await patchRes.text());
    process.exit(1);
  }

  const patchResult = await patchRes.json();
  console.log('PATCH succeeded! Saved games count:', patchResult[0]?.games?.length);
  process.exit(0);
}

run();
