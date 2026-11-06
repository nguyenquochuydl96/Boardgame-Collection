async function test() {
  const url = 'https://xxwdasgmfrseisbcarza.supabase.co/rest/v1/vaults?vault_id=eq.huy-vault-2026&select=*';
  const anonKey = 'sb_publishable_exmu-e2HUcITKdY02X-P6Q_BeX0v3z0';
  const res = await fetch(url, { headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey } });
  const rows = await res.json();
  const games: any[] = rows[0].games;
  const owned = games.filter(g => g.status === 'own');
  console.log('Owned count:', owned.length);
  for (const g of owned) {
    console.log(`${g.name}: ${g.purchasePrice}`);
  }
  const total = owned.reduce((s, g) => s + (g.purchasePrice || 0), 0);
  console.log('Total owned value:', total);
}
test();
