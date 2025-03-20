#!/bin/bash

# Configuration
WALLPAPER_DIR="$HOME/Pictures/Wallpapers"
SET_WALLPAPER_SCRIPT="$HOME/.config/ags/scripts/color_generation/colorgen.sh"
TIME_INTERVAL=30
APP_NAME="wallpaper_cycle"

# Function to get a random wallpaper
get_random_wallpaper() {
  local wallpapers=($(find "$WALLPAPER_DIR" -type f -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif"))
  local count="${#wallpapers[@]}"

  if [ "$count" -eq 0 ]; then
    echo "No wallpapers found in $WALLPAPER_DIR"
    return 1
  fi

  local index=$((RANDOM % count))
  echo "${wallpapers[$index]}"
}

# Main loop
while true; do
  # Use a function to encapsulate local variables
  change_wallpaper() {
    local wallpaper=$(get_random_wallpaper)
    if [ -n "$wallpaper" ]; then
      "$SET_WALLPAPER_SCRIPT" "$wallpaper"
      echo "Wallpaper changed to: $wallpaper"
    else
      echo "Failed to set wallpaper."
    fi
  }

  change_wallpaper
  sleep "$TIME_INTERVAL"
done