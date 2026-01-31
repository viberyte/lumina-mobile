#!/bin/bash
echo "=== DATABASE SCHEMA ==="
sqlite3 /opt/viberyte/lumina.db ".schema venues" 2>/dev/null || echo "Cannot access venues table"
echo ""
echo "=== SAMPLE VENUE DATA ==="
sqlite3 /opt/viberyte/lumina.db "SELECT id, name, why_recommended, instagram_url FROM venues LIMIT 3;" 2>/dev/null || echo "Cannot query venues"
echo ""
echo "=== CHECK PHOTO COLUMNS ==="
sqlite3 /opt/viberyte/lumina.db "SELECT COUNT(*) as total, 
  SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as has_image_url,
  SUM(CASE WHEN google_photos IS NOT NULL THEN 1 ELSE 0 END) as has_google_photos,
  SUM(CASE WHEN instagram_url IS NOT NULL THEN 1 ELSE 0 END) as has_instagram
FROM venues;" 2>/dev/null || echo "Cannot check photo stats"
