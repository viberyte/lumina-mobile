const Database = require('better-sqlite3');
const db = new Database('./lumina.db');

console.log('🔍 CHECKING ENRICHMENT PROGRESS\n');

// Total venues
const total = db.prepare('SELECT COUNT(*) as count FROM venues WHERE is_excluded = 0').get();
console.log(`Total Active Venues: ${total.count}`);

// Venues with v3.0 enhancement (cuisine/vibes/music)
const withCuisine = db.prepare('SELECT COUNT(*) as count FROM venues WHERE cuisine IS NOT NULL AND cuisine != ""').get();
const withVibes = db.prepare('SELECT COUNT(*) as count FROM venues WHERE vibes IS NOT NULL AND vibes != ""').get();
const withMusic = db.prepare('SELECT COUNT(*) as count FROM venues WHERE music_genres IS NOT NULL AND music_genres != ""').get();
const withLoungeType = db.prepare('SELECT COUNT(*) as count FROM venues WHERE lounge_type IS NOT NULL AND lounge_type != ""').get();

console.log(`\nWith Cuisine: ${withCuisine.count} (${Math.round(withCuisine.count/total.count*100)}%)`);
console.log(`With Vibes: ${withVibes.count} (${Math.round(withVibes.count/total.count*100)}%)`);
console.log(`With Music Genres: ${withMusic.count} (${Math.round(withMusic.count/total.count*100)}%)`);
console.log(`With Lounge Type: ${withLoungeType.count} (${Math.round(withLoungeType.count/100)}%)`);

// Venues with AI insights (what_to_expect, etc.)
const withInsights = db.prepare('SELECT COUNT(*) as count FROM venues WHERE what_to_expect IS NOT NULL').get();
console.log(`\nWith AI Insights: ${withInsights.count} (${Math.round(withInsights.count/total.count*100)}%)`);

// Venues with photos
const withPhotos = db.prepare('SELECT COUNT(*) as count FROM venues WHERE photo_reference IS NOT NULL AND photo_reference != ""').get();
console.log(`With Photos: ${withPhotos.count} (${Math.round(withPhotos.count/total.count*100)}%)`);

// Sample 3 recently enriched venues
console.log('\n📸 SAMPLE RECENTLY ENRICHED VENUES:\n');
const recent = db.prepare(`
  SELECT name, city, cuisine, vibes, music_genres, lounge_type
  FROM venues 
  WHERE cuisine IS NOT NULL 
  ORDER BY RANDOM() 
  LIMIT 3
`).all();

recent.forEach((v, i) => {
  console.log(`${i+1}. ${v.name} (${v.city})`);
  console.log(`   Cuisine: ${v.cuisine || 'N/A'}`);
  console.log(`   Vibes: ${v.vibes || 'N/A'}`);
  console.log(`   Music: ${v.music_genres || 'N/A'}`);
  console.log(`   Lounge: ${v.lounge_type || 'N/A'}\n`);
});

db.close();
