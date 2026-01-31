#!/bin/bash
echo "🔍 Background job status:"
ps aux | grep generate_venue_bios.js | grep -v grep || echo "❌ Job not running"
echo ""
echo "📊 Current completion:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN why_recommended IS NOT NULL THEN 1 ELSE 0 END) as completed,
  COUNT(*) - SUM(CASE WHEN why_recommended IS NOT NULL THEN 1 ELSE 0 END) as remaining
FROM venues;"
echo ""
echo "📄 Last 10 lines of log:"
tail -10 bio_generation.log 2>/dev/null || echo "No log file yet"
