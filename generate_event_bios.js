const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');

const db = new sqlite3.Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

// Add columns
db.run('ALTER TABLE events ADD COLUMN why_recommended TEXT', () => {});
db.run('ALTER TABLE events ADD COLUMN peak_hours TEXT', () => {});
db.run('ALTER TABLE events ADD COLUMN crowd_type TEXT', () => {});

async function generateEventBio(event) {
  const prompt = `Write a compelling 2-sentence bio for "${event.title}", a ${event.genre || 'nightlife'} event.

Context:
- Venue: ${event.venue_name || 'N/A'}
- Genre: ${event.genre || 'N/A'}
- Date: ${event.date}

Write in FOMO-inducing tone. Focus on: (1) What makes this event special, (2) The energy attendees expect.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 120
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error:`, error.message);
    return null;
  }
}

function generatePeakHours(genre) {
  const g = genre?.toLowerCase() || '';
  
  if (g.includes('brunch') || g.includes('day party')) {
    return '⚡ Peak: 1PM-4PM | 🔥 Steady crowd | 💡 Arrive by 12:30PM';
  }
  if (g.includes('afrobeat') || g.includes('latin')) {
    return '⚡ Peak: 11:30PM-2AM | 🚫 Long lines after midnight | 💡 Arrive by 11PM';
  }
  if (g.includes('edm') || g.includes('house')) {
    return '⚡ Peak: 12:30AM-2:30AM | 🔥 DJ peaks at 1AM | 💡 Lines form after midnight';
  }
  if (g.includes('hip-hop') || g.includes('rap')) {
    return '⚡ Peak: 11PM-1:30AM | 🚫 Expect lines after 11:30PM | 💡 VIP recommended';
  }
  return '⚡ Peak: 11PM-1AM | 🔥 Crowded throughout | 💡 Arrive before 11PM';
}

function analyzeCrowdType(event) {
  const g = event.genre?.toLowerCase() || '';
  const v = event.venue_name?.toLowerCase() || '';
  const t = event.title?.toLowerCase() || '';
  
  let crowd = [];
  
  if (g.includes('afrobeat')) crowd.push('Cultural', 'Vibrant', 'Diverse');
  if (g.includes('latin')) crowd.push('Energetic', 'Dance-focused', 'Latin community');
  if (g.includes('edm')) crowd.push('Rave culture', 'High-energy', 'Younger crowd');
  if (g.includes('hip-hop')) crowd.push('Hip-hop heads', 'Streetwear', 'Urban');
  if (v.includes('rooftop') || t.includes('rooftop')) crowd.push('Upscale', 'Instagram-worthy');
  if (t.includes('brunch')) crowd.push('Day party', 'Social', 'Brunchers');
  
  return crowd.join(' • ') || 'Mixed nightlife crowd';
}

async function processBatch(batchSize = 10) {
  return new Promise((resolve) => {
    db.all('SELECT * FROM events WHERE why_recommended IS NULL LIMIT ?', [batchSize], async (err, events) => {
      if (err || !events.length) {
        resolve(0);
        return;
      }
      
      console.log(`\n📦 Processing ${events.length} events...`);
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        console.log(`[${i + 1}/${events.length}] ${event.title}`);
        
        const bio = await generateEventBio(event);
        const peakHours = generatePeakHours(event.genre);
        const crowdType = analyzeCrowdType(event);
        
        if (bio) {
          await new Promise((res) => {
            db.run(
              'UPDATE events SET why_recommended = ?, peak_hours = ?, crowd_type = ? WHERE id = ?',
              [bio, peakHours, crowdType, event.id],
              () => {
                console.log(`✅ ${bio.substring(0, 60)}...`);
                res();
              }
            );
          });
        }
        
        await new Promise(res => setTimeout(res, 500));
      }
      
      db.get('SELECT COUNT(*) as count FROM events WHERE why_recommended IS NULL', (err, row) => {
        console.log(`\n📊 Remaining: ${row?.count || 0}`);
        resolve(row?.count || 0);
      });
    });
  });
}

async function main() {
  console.log('🚀 Starting Event Bio Generation...\n');
  
  db.get('SELECT COUNT(*) as count FROM events', async (err, total) => {
    db.get('SELECT COUNT(*) as count FROM events WHERE why_recommended IS NOT NULL', async (err2, completed) => {
      console.log(`Total: ${total.count} | Completed: ${completed.count} | Remaining: ${total.count - completed.count}\n`);
      
      let remaining = total.count - completed.count;
      
      while (remaining > 0) {
        remaining = await processBatch(10);
        if (remaining > 0) {
          console.log('⏸️  Waiting 5s...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log('\n✨ All event bios generated!');
      db.close();
    });
  });
}

main().catch(console.error);
