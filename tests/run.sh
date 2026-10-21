#!/usr/bin/env bash
# Runs every Playwright suite. Needs: npm i -D playwright (or NODE_PATH pointing at one), plus a Chromium.
# pw13 (3000-round category distribution) is slow; it's skipped unless you pass "all".
cd "$(dirname "$0")"
fail=0
for f in pw5 pw6 pw8 pw9 pw10 pw11 pw12 pw14 pw15 pw16 pw17 pw18 pw19 pw20 pw21 pw22 pw23 pw24 pw25 pw26 pw27 ${1:+pw13}; do
  out=$(timeout 600 node "$f.js" 2>&1); code=$?
  line=$(echo "$out" | grep -E "passed|layout shift|largest relative gap" | tail -1)
  if [ $code -ne 0 ] || echo "$out" | grep -qE "^FAIL|^ERR"; then fail=1; echo "✗ $f"; echo "$out" | grep -E "FAIL|ERR" | head -5; else echo "✓ $f  $line"; fi
done
exit $fail
