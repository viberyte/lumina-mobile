#!/bin/bash
echo "🔧 Installing dependencies..."
npm install openai better-sqlite3 --save

echo ""
echo "🚀 Starting bio generation (this will take ~30-40 minutes for 4,096 venues)..."
echo "Processing in batches of 10 venues with rate limiting..."
echo ""

node generate_venue_bios.js

echo ""
echo "✅ Bio generation complete!"
echo ""
echo "📊 Checking results..."
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) as total, 
  SUM(CASE WHEN why_recommended IS NOT NULL THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN why_recommended IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as percentage
FROM venues;"
