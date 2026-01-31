const Database = require('better-sqlite3');
const OpenAI = require('openai');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Add why_recommended column if it doesn't exist
try {
  db.exec('ALTER TABLE venues ADD COLUMN why_recommended TEXT');
  console.log('✅ Added why_recommended column');
} catch (e) {
  console.log('Column why_recommended already exists');
}

async function generateBio(venue) {
  const vibeTags = venue.vibe_tags ? JSON.parse(venue.vibe_tags) : [];
  const musicGenres = venue.music_genres ? JSON.parse(venue.music_genres) : [];
  const cuisineTypes = venue.cuisine_types ? JSON.parse(venue.cuisine_types) : [];
  
  const prompt = `Write a compelling 2-sentence bio for ${venue.name}, a ${venue.category} venue in ${venue.city}.

Context:
- Category: ${venue.category}${venue.subcategory ? ` (${venue.subcategory})` : ''}
- Vibe: ${vibeTags.join(', ') || 'N/A'}
- Music: ${musicGenres.join(', ') || 'N/A'}
- Cuisine: ${cuisineTypes.join(', ') || 'N/A'}
- Price: ${venue.price_tier || 'N/A'}
- Rating: ${venue.rating || 'N/A'}/5.0

Write in a natural, enthusiastic tone that makes someone want to visit. Focus on what makes this place special and the experience guests can expect. Be specific and vivid.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 150
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error generating bio for ${venue.name}:`, error.message);
    return null;
  }
}

async function processBatch(batchSize = 10) {
  const venues = db.prepare(`
    SELECT * FROM venues 
    WHERE why_recommended IS NULL 
    LIMIT ?
  `).all(batchSize);

  console.log(`\n📦 Processing batch of ${venues.length} venues...`);
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    console.log(`[${i + 1}/${venues.length}] Generating bio for: ${venue.name}`);
    
    const bio = await generateBio(venue);
    
    if (bio) {
      db.prepare('UPDATE venues SET why_recommended = ? WHERE id = ?')
        .run(bio, venue.id);
      console.log(`✅ ${bio.substring(0, 80)}...`);
    } else {
      console.log('❌ Failed');
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM venues WHERE why_recommended IS NULL').get();
  console.log(`\n📊 Remaining venues: ${remaining.count}`);
  
  return remaining.count;
}

async function main() {
  console.log('🚀 Starting AI Bio Generation...\n');
  
  const total = db.prepare('SELECT COUNT(*) as count FROM venues').get();
  const completed = db.prepare('SELECT COUNT(*) as count FROM venues WHERE why_recommended IS NOT NULL').get();
  
  console.log(`Total venues: ${total.count}`);
  console.log(`Already completed: ${completed.count}`);
  console.log(`Remaining: ${total.count - completed.count}\n`);
  
  let remaining = total.count - completed.count;
  
  while (remaining > 0) {
    remaining = await processBatch(10);
    
    if (remaining > 0) {
      console.log('\n⏸️  Waiting 5 seconds before next batch...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n✨ All venue bios generated!');
  db.close();
}

main().catch(console.error);
