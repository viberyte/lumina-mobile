#!/bin/bash
DB_PATH="/opt/viberyte/lumina-web/data/lumina.db"

echo "=== CHECK WHY_RECOMMENDED COLUMN ==="
sqlite3 $DB_PATH "SELECT COUNT(*) as total,
  SUM(CASE WHEN why_recommended IS NOT NULL AND why_recommended != '' THEN 1 ELSE 0 END) as has_why_recommended
FROM venues;" 2>/dev/null

echo ""
echo "=== CHECK BIO COLUMN ==="
sqlite3 $DB_PATH "SELECT COUNT(*) as total,
  SUM(CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 ELSE 0 END) as has_bio
FROM venues;" 2>/dev/null

echo ""
echo "=== SAMPLE VENUE WITH FULL DATA ==="
sqlite3 $DB_PATH "SELECT id, name, vibe_tags, google_photos FROM venues WHERE google_photos IS NOT NULL LIMIT 1;" 2>/dev/null

echo ""
echo "=== CHECK INSTAGRAM URLS ==="
sqlite3 $DB_PATH "SELECT instagram_url FROM venues WHERE instagram_url IS NOT NULL LIMIT 3;" 2>/dev/null

echo ""
echo "=== EVENTS WITH VENUE_ID ==="
sqlite3 $DB_PATH "SELECT id, title, venue_id, venue_name, date FROM events WHERE venue_id IS NOT NULL LIMIT 3;" 2>/dev/null
