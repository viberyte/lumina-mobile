const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');

const db = new sqlite3.Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Add why_recommended column if it doesn't exist
db.run('ALTER TABLE venues ADD COLUMN why_recommended TEXT', (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding column:', err);
  }
});

async function generateBio(venue) {
  let vibeTags = [];
  let musicGenres = [];
  let cuisineTypes = [];
  
  try {
    vibeTags = venue.vibe_tags ? JSON.parse(venue.vibe_tags) : [];
  } catch (e) {}
  
  try {
    musicGenres = venue.music_genres ? JSON.parse(venue.music_genres) : [];
  } catch (e) {}
  
  try {
    cuisineTypes = venue.cuisine_types ? JSON.parse(venue.cuisine_types) : [];
  } catch (e) {}
  
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

function getVenuesNeedingBios(limit, callback) {
  db.all(`
    SELECT * FROM venues 
    WHERE why_recommended IS NULL 
    LIMIT ?
  `, [limit], callback);
}

function updateVenueBio(id, bio, callback) {
  db.run('UPDATE venues SET why_recommended = ? WHERE id = ?', [bio, id], callback);
}

function getRemainingCount(callback) {
  db.get('SELECT COUNT(*) as count FROM venues WHERE why_recommended IS NULL', callback);
}

async function processBatch(batchSize = 10) {
  return new Promise((resolve) => {
    getVenuesNeedingBios(batchSize, async (err, venues) => {
      if (err) {
        console.error('Database error:', err);
        resolve(0);
        return;
      }
      
      console.log(`\n📦 Processing batch of ${venues.length} venues...`);
      
      for (let i = 0; i < venues.length; i++) {
        const venue = venues[i];
        console.log(`[${i + 1}/${venues.length}] Generating bio for: ${venue.name}`);
        
        const bio = await generateBio(venue);
        
        if (bio) {
          await new Promise((res) => {
            updateVenueBio(venue.id, bio, () => {
              console.log(`✅ ${bio.substring(0, 80)}...`);
              res();
            });
          });
        } else {
          console.log('❌ Failed');
        }
        
        // Rate limiting
        await new Promise(res => setTimeout(res, 500));
      }
      
      getRemainingCount((err, row) => {
        if (!err) {
          console.log(`\n📊 Remaining venues: ${row.count}`);
          resolve(row.count);
        } else {
          resolve(0);
        }
      });
    });
  });
}

async function main() {
  console.log('🚀 Starting AI Bio Generation...\n');
  
  db.get('SELECT COUNT(*) as count FROM venues', async (err, total) => {
    db.get('SELECT COUNT(*) as count FROM venues WHERE why_recommended IS NOT NULL', async (err2, completed) => {
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
    });
  });
}

main().catch(console.error);
