async function run() {
  const url = 'https://xxwdasgmfrseisbcarza.supabase.co/rest/v1/vaults?vault_id=eq.huy-vault-2026&select=*';
  const anonKey = 'sb_publishable_exmu-e2HUcITKdY02X-P6Q_BeX0v3z0';

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  const rows = await res.json();
  const games: any[] = rows[0].games || [];

  const ownedGames = games.filter((g) => g.status === 'own');
  console.log('Currently owned games in Supabase count:', ownedGames.length);
  console.log('Owned games:', ownedGames.map((g) => g.name));

  const tableGames = [
    'Iron Clays 200',
    'Brass: Birmingham',
    'Codenames: Pictures',
    'Critter Kitchen',
    "Darwin's Journey",
    'Deep Sea Adventure',
    'Dokojong',
    'Dune: Imperium – Uprising',
    'Durian',
    'Faraway',
    'Flip 7: With A Vengeance',
    'FlipToons',
    'Fort',
    'Great Western Trail: Second Edition',
    'Keep the Heroes Out!',
    'Long Shot: The Dice Game',
    'Love Letter',
    'Marvel United',
    'Marvel United: X-Men',
    'Maskmen',
    'Mind MGMT: The Psychic Espionage "Game." + Upgrade Kit',
    'Modern Art',
    'Phase 10',
    'Rising Sun',
    'Saboteur',
    'Sail',
    'SCOUT',
    'Secret Hitler',
    'Slay the Spire: The Board Game',
    'Skull',
    'Spirit Island',
    'Splendor Duel',
    'Stardew Valley: The Board Game',
    'Startups',
    'Tiletum',
    'Tiny Towns',
    'The White Castle',
    'Waka Tanka',
    'Zoo Vadis',
  ];

  for (const name of tableGames) {
    const found = games.find((g) => g.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)));
    console.log(`Table: "${name}" => Found: ${found ? `"${found.name}" (id: ${found.id}, status: ${found.status}, price: ${found.purchasePrice})` : 'NOT FOUND'}`);
  }
}

run();
