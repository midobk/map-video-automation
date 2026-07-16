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

  pnpm --filter @mapvideo/remotion-studio exec remotion still "$id" "$out1" --frame="$frame" >/dev/null 2>&1
  pnpm --filter @mapvideo/remotion-studio exec remotion still "$id" "$out2" --frame="$frame" >/dev/null 2>&1

  local h1 h2
  h1=$(shasum -a 256 "$out1" | cut -d' ' -f1)
  h2=$(shasum -a 256 "$out2" | cut -d' ' -f1)

  if [ "$h1" != "$h2" ]; then
    echo "FAIL: $name frame $frame is non-deterministic ($h1 vs $h2)"
    return 1
  fi
  echo "OK: $name frame $frame  $h1"
}

assert_frames_differ() {
  local first=$1
  local second=$2
  local label=$3

  if cmp -s "$OUT_DIR/${first}-1.png" "$OUT_DIR/${second}-1.png"; then
    echo "FAIL: $label snapshots are byte-identical; the requested frame may not have been applied"
    return 1
  fi
  echo "OK: $label snapshots differ"
}

echo "=== Visual regression / determinism check ==="
render_twice starter 0 starter-frame-0
render_twice starter 60 starter-frame-60
render_twice starter 179 starter-frame-179
render_twice map-video 0 map-video-frame-0
render_twice map-video 128 map-video-frame-map
render_twice map-video 165 map-video-frame-comparison
render_twice map-video 254 map-video-frame-last
render_twice map-video-rtl 0 rtl-frame-0
render_twice map-video-rtl 128 rtl-frame-map
render_twice map-video-rtl 165 rtl-frame-comparison
render_twice map-video-rtl 254 rtl-frame-last
render_twice map-video-country-zoom 90 country-zoom-morocco
render_twice map-video-country-zoom 150 country-zoom-canada
render_twice map-video-country-zoom 210 country-zoom-algeria
render_twice map-video-country-zoom 270 country-zoom-france
render_twice map-video-ranking 100 ranking-list
render_twice map-video-ranking 190 ranking-stat-card

assert_frames_differ starter-frame-0 starter-frame-60 "starter frame 0 and frame 60"
assert_frames_differ map-video-frame-0 map-video-frame-map "neutral map-video frame 0 and map frame"
assert_frames_differ map-video-frame-map map-video-frame-comparison "neutral map and comparison scenes"
assert_frames_differ rtl-frame-0 rtl-frame-map "RTL frame 0 and map frame"
assert_frames_differ rtl-frame-map rtl-frame-comparison "RTL map and comparison scenes"
assert_frames_differ country-zoom-morocco country-zoom-canada "Morocco and later Canada zooms"
assert_frames_differ country-zoom-canada country-zoom-algeria "Canada and later Algeria zooms"
assert_frames_differ country-zoom-algeria country-zoom-france "Algeria and later France zooms"
assert_frames_differ ranking-list ranking-stat-card "ranking and stat-card scenes"

echo "=== All requested frames are deterministic and scene-distinct ==="
