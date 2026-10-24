const https = require('https');

const SHEET_ID = '1CTSEC-J52yGD-VIxOuzyNZ8Qddg0bmOIzMSzRVM6ZTI';
const SHEET_NAME = 'Boardgame%20Collection';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

console.log('Fetching from:', url);

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const jsonStr = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);
    
    const rows = parsed.table.rows;
    const cols = parsed.table.cols;
    
    console.log('\n=== COLUMN HEADERS ===');
    cols.forEach((col, idx) => {
      console.log(`Col ${idx}: "${col.label}"`);
    });
    
    console.log('\n=== PARSED GAMES ===');
    let realGames = [];
    let fakeGames = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.c) continue;
      
      const name = row.c[1]?.v || '';
      const authenticity = row.c[2]?.v || 'Real';
      const type = row.c[3]?.v || 'Base Game';
      const price = row.c[4]?.v || 0;
      const status = row.c[5]?.v || 'On hand';
      
      if (!name) continue;
      
      const game = {
        name,
        authenticity,
        type,
        price,
        status,
        cabinetType: authenticity.toLowerCase().includes('fake') ? 'fake' : 'real'
      };
      
      if (game.cabinetType === 'fake') {
        fakeGames.push(game);
      } else {
        realGames.push(game);
      }
    }
    
    console.log('\n📦 REAL COLLECTION (' + realGames.length + ' games):');
    realGames.forEach((g, idx) => {
      console.log(`  ${idx + 1}. ${g.name} - ${g.type} - ${g.status}`);
    });
    
    console.log('\n🎭 REPLICAS & FAKE (' + fakeGames.length + ' games):');
    fakeGames.forEach((g, idx) => {
      console.log(`  ${idx + 1}. ${g.name} - ${g.type} - ${g.status}`);
    });
    
    console.log('\n✅ SYNC SUMMARY:');
    console.log(`   Total games: ${realGames.length + fakeGames.length}`);
    console.log(`   Real Collection: ${realGames.length} games`);
    console.log(`   Replicas & Fake: ${fakeGames.length} games`);
  });
}).on('error', err => {
  console.error('Error:', err);
});
