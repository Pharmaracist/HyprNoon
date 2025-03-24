#!/usr/bin/env bash

# Directories
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
STATE_DIR="$XDG_STATE_HOME/ags"
WALLPAPER_FILE="$STATE_DIR/user/current_wallpaper.txt"
WALL_JSON_FILE="$STATE_DIR/user/wallpaper.json"

# Read color scheme and light/dark mode settings
colorscheme=$(sed -n '3p' "$STATE_DIR/user/colormode.txt")
lightdark=$(sed -n '1p' "$STATE_DIR/user/colormode.txt")
contrast=0.3 # TODO $(sed -n '8p' "$STATE_DIR/user/colormode.txt")

# SWWW options for wallpaper transition
SWWW_OPTIONS="
    --transition-type center \
    --transition-duration 1.5 \
    --transition-step 90 \
    --transition-fps 144 \
    -f Nearest
"

# Function to set the wallpaper
main () {
    # Check if the first argument is provided (image path); otherwise use last stored wallpaper
    if [[ -n "$1" ]]; then
        currentwallpaper="$1"
    else
        # Use the wallpaper from current_wallpaper.txt if no argument is provided
        if [[ -f "$WALLPAPER_FILE" ]]; then
            currentwallpaper=$(< "$WALLPAPER_FILE")
        else
            echo "Error: No wallpaper argument provided and no stored wallpaper found."
            exit 1
        fi
    fi

    # Check if the wallpaper file exists
    if [[ -f "$currentwallpaper" ]]; then
        echo "$currentwallpaper" > "$WALLPAPER_FILE" 
        swww img $SWWW_OPTIONS "$currentwallpaper" 
        matugen image "$currentwallpaper" --type "$colorscheme" --mode "$lightdark" --contrast "$contrast" 
    else
        echo "Error: Wallpaper file not found at '$currentwallpaper'"
        exit 1
    fi
}

main "$1" &
