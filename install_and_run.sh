#!/bin/bash
echo "🔧 Force installing sqlite3..."
npm install sqlite3 --legacy-peer-deps --force

echo ""
echo "✅ Verifying installation..."
ls -la node_modules/sqlite3 2>/dev/null && echo "sqlite3 installed ✓" || echo "sqlite3 NOT installed ✗"

echo ""
echo "🚀 Running bio generation script..."
node generate_venue_bios_fixed.js
