#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_DIR="$(pwd)/apps/remotion-studio/out/visual-regression"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

render_twice() {
  local id=$1
  local frame=$2
  local name=$3
  local out1="$OUT_DIR/${name}-1.png"
  local out2="$OUT_DIR/${name}-2.png"

  pnpm --filter @mapvideo/remotion-studio exec remotion still "$id" "$out1" "$frame" >/dev/null 2>&1
  pnpm --filter @mapvideo/remotion-studio exec remotion still "$id" "$out2" "$frame" >/dev/null 2>&1

  local h1 h2
  h1=$(shasum -a 256 "$out1" | cut -d' ' -f1)
  h2=$(shasum -a 256 "$out2" | cut -d' ' -f1)

  if [ "$h1" != "$h2" ]; then
    echo "FAIL: $name frame $frame is non-deterministic ($h1 vs $h2)"
    return 1
  fi
  echo "OK: $name frame $frame  $h1"
}

echo "=== Visual regression / determinism check ==="
render_twice starter 0 starter-frame-0
render_twice starter 60 starter-frame-60
render_twice starter 179 starter-frame-179
render_twice map-video 0 map-video-frame-0
render_twice map-video 128 map-video-frame-mid
render_twice map-video 254 map-video-frame-last
render_twice map-video-rtl 0 rtl-frame-0
render_twice map-video-rtl 128 rtl-frame-mid
render_twice map-video-rtl 254 rtl-frame-last

echo "=== All frames are deterministic ==="
