#!/usr/bin/env bash

# Configuration
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/ags"
YAD="yad --width 1200 --height 800 --file --add-preview --large-preview --title='Choose wallpaper'"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
SCRIPTS_DIR="$XDG_CONFIG_HOME/ags/scripts"
CACHE_DIR="$XDG_CACHE_HOME/ags"
STATE_DIR="$XDG_STATE_HOME/ags"
COLORMODE_FILE="$STATE_DIR/user/colormode.txt" # Consistent naming
LAST_WALLPAPER_FILE="$STATE_DIR/last_wallpaper.txt" # Store last wallpaper path
FOURTH=$(sed -n '4p' "$COLORMODE_FILE") # Consistent naming

# Ensure necessary directories exist
mkdir -p "$HOME/Pictures/Wallpapers" "$STATE_DIR" # Create STATE_DIR if it doesn't exist

# Validate and set wallpaper
set_wallpaper() {
  swww img "$1" --transition-fps 144 --transition-type fade --transition-duration 0.3
  $CONFIG_DIR/scripts/color_generation/colorgen.sh "$1"
  echo "$1" > "$LAST_WALLPAPER_FILE" # Save the wallpaper path
}

# Main
img="$1"

# Check for --switch argument
if [[ "$1" == "--switch" ]]; then
  if [[ -f "$LAST_WALLPAPER_FILE" ]]; then
    img=$(cat "$LAST_WALLPAPER_FILE")
  else
    echo "No last wallpaper found."
    exit 1
  fi
elif [[ -z "$img" ]]; then
    img=$($YAD)
fi

# Make sure the user has selected a valid image
if [[ -n "$img" && -f "$img" ]]; then
    if [[ "$FOURTH" != *"none"* ]]; then # Consistent variable name
        gowall convert "$img" -t "$FOURTH" && 
        set_wallpaper "$img" # Consistent variable name
    else
        set_wallpaper "$img"
    fi
else
    echo "No valid image selected or file does not exist."
    exit 1
fi