#!/bin/bash

echo "=== EVENTS TABLE STRUCTURE ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db ".schema events"

echo ""
echo "=== TOTAL EVENTS ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM events;"

echo ""
echo "=== SAMPLE EVENT RECORDS (3 rows) ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode json
SELECT * FROM events LIMIT 3;
SQL

echo ""
echo "=== EVENTS MISSING PROMOTER INFO ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM events WHERE promoter_name IS NULL OR promoter_name = '';"

echo ""
echo "=== EVENTS MISSING VENUE MATCH ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM events WHERE venue_id IS NULL;"

echo ""
echo "=== COLUMN LIST ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "PRAGMA table_info(events);"
