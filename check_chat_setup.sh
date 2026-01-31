#!/bin/bash
echo "📱 === CHECKING CHAT PAGE ==="
cat /opt/viberyte/lumina-mobile/app/\(tabs\)/chat.tsx | head -50

echo ""
echo "🔧 === CHECKING BACKEND API ==="
echo "Plan Evening API:"
ls -la /opt/viberyte/lumina-web/app/api/plan-evening/ 2>/dev/null || echo "Not found"

echo ""
echo "Chat API:"
ls -la /opt/viberyte/lumina-web/app/api/chat/ 2>/dev/null || echo "Not found"

echo ""
echo "📊 === CHECKING DATABASE FOR PLAN MY NIGHT ==="
sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%plan%';" 2>/dev/null || echo "No plan tables"
