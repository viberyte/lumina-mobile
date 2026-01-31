#!/bin/bash
DB_PATH="/opt/viberyte/lumina-web/data/lumina.db"

echo "=== DATABASE SCHEMA ==="
sqlite3 $DB_PATH ".schema venues" 2>/dev/null | head -30 || echo "Cannot access venues table"

echo ""
echo "=== SAMPLE VENUE DATA ==="
sqlite3 $DB_PATH "SELECT id, name, city, image_url FROM venues LIMIT 3;" 2>/dev/null || echo "Cannot query venues"

echo ""
echo "=== PHOTO COLUMN STATS ==="
sqlite3 $DB_PATH "SELECT COUNT(*) as total, 
  SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as has_image_url,
  SUM(CASE WHEN google_photos IS NOT NULL THEN 1 ELSE 0 END) as has_google_photos,
  SUM(CASE WHEN instagram_url IS NOT NULL THEN 1 ELSE 0 END) as has_instagram
FROM venues;" 2>/dev/null || echo "Cannot check photo stats"

echo ""
echo "=== VENUE COUNT BY CITY ==="
sqlite3 $DB_PATH "SELECT city, COUNT(*) as count FROM venues GROUP BY city ORDER BY count DESC LIMIT 10;" 2>/dev/null || echo "Cannot get city stats"

echo ""
echo "=== EVENTS TABLE ==="
sqlite3 $DB_PATH "SELECT COUNT(*) as total_events FROM events;" 2>/dev/null || echo "Cannot query events"
