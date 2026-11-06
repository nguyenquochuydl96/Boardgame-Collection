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
  if (!rows || rows.length === 0) {
    console.log('No vault found for huy-vault-2026');
    process.exit(0);
  }

  const data = rows[0];
  console.log('Vault updated_at:', data.updated_at);
  console.log('Games count:', data.games?.length);
  const games: any[] = data.games || [];
  console.log(
    'Games list summary:',
    JSON.stringify(
      games.map((g) => ({
        id: g.id,
        name: g.name,
        status: g.status,
        purchasePrice: g.purchasePrice,
      })),
      null,
      2
    )
  );
  process.exit(0);
}

run();
