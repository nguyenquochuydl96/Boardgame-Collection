async function test() {
  const url = 'https://xxwdasgmfrseisbcarza.supabase.co/rest/v1/vaults?vault_id=eq.huy-vault-2026&select=*';
  const anonKey = 'sb_publishable_exmu-e2HUcITKdY02X-P6Q_BeX0v3z0';
  const res = await fetch(url, { headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey } });
  const rows = await res.json();
  const games: any[] = rows[0].games;
  console.log('Total games:', games.length);
  const marvel = games.filter(g => g.name.toLowerCase().includes('marvel'));
  console.log('Marvel games:', JSON.stringify(marvel.map(g => ({ id: g.id, bggId: g.bggId, name: g.name, status: g.status })), null, 2));
  const clays = games.filter(g => g.name.toLowerCase().includes('clay') || g.name.toLowerCase().includes('iron'));
  console.log('Clay/Iron games:', JSON.stringify(clays.map(g => ({ id: g.id, bggId: g.bggId, name: g.name, status: g.status })), null, 2));
}
test();
