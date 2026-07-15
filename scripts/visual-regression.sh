#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_DIR="$(pwd)/apps/remotion-studio/out/visual-regression"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Render a single frame via the full render pipeline. This is required for
# compositions that use <Sequence>, because `remotion still` only captures the
# root element for those compositions.
render_video_frame_twice() {
  local id=$1
  local frame=$2
  local name=$3
  local dir1="$OUT_DIR/${name}-1"
  local dir2="$OUT_DIR/${name}-2"

  rm -rf "$dir1" "$dir2"
  mkdir -p "$dir1" "$dir2"

  pnpm --filter @mapvideo/remotion-studio exec remotion render "$id" "$dir1" --frames="${frame}-${frame}" --sequence --image-format=png >/dev/null 2>&1
  pnpm --filter @mapvideo/remotion-studio exec remotion render "$id" "$dir2" --frames="${frame}-${frame}" --sequence --image-format=png >/dev/null 2>&1

  local file1 file2 h1 h2
  file1=$(find "$dir1" -type f | head -n 1)
  file2=$(find "$dir2" -type f | head -n 1)
  h1=$(shasum -a 256 "$file1" | cut -d' ' -f1)
  h2=$(shasum -a 256 "$file2" | cut -d' ' -f1)

  if [ "$h1" != "$h2" ]; then
    echo "FAIL: $name frame $frame is non-deterministic ($h1 vs $h2)"
    return 1
  fi
  echo "OK: $name frame $frame  $h1"
}

render_still_twice() {
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
render_still_twice starter 0 starter-frame-0
render_still_twice starter 60 starter-frame-60
render_still_twice starter 179 starter-frame-179
render_video_frame_twice map-video 120 map-video-frame-mid
render_video_frame_twice map-video-rtl 120 rtl-frame-mid
render_video_frame_twice map-video-country-zoom 190 country-zoom-frame-mid
render_video_frame_twice map-video-ranking 100 ranking-frame-mid

echo "=== All frames are deterministic ==="
