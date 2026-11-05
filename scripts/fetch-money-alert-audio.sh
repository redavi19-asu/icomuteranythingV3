#!/usr/bin/env bash
set -euo pipefail

# Recordings licensed CC BY 4.0, credited in public/audio/MONEY_ALERT_ATTRIBUTION.txt
# and on the sound controls in ICA PRIME.
dir="public/audio"
mkdir -p "$dir"
download() {
  local url="$1" output="$2" mime size
  curl --fail --location --silent --show-error --retry 3 --retry-delay 2     --connect-timeout 12 --max-time 75 -A "Mozilla/5.0" "$url" --output "$output"
  size="$(wc -c <"$output")"
  mime="$(file --brief --mime-type "$output")"
  if [[ "$size" -lt 10000 || "$size" -gt 2500000 || "$mime" != "audio/mpeg" ]]; then
    echo "Invalid recording from licensed sound URL: $output ($mime, $size bytes)" >&2
    exit 1
  fi
  echo "Validated licensed recording $output ($mime, $size bytes)"
}

download "https://www.orangefreesounds.com/wp-content/uploads/2016/02/Money-counting-machine.mp3"   "$dir/ica-real-money-counter.mp3"
download "https://www.orangefreesounds.com/wp-content/uploads/2016/08/Security-beep-sound.mp3"   "$dir/ica-real-machine-beep.mp3"
