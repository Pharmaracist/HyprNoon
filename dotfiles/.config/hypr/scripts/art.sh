#!/usr/bin/bash

# Default image path
default_art="$HOME/.config/hypr/images/default_art.png"

# Check if any player is running
if ! playerctl status >/dev/null 2>&1; then
    echo "$default_art"
    exit 0
fi

# Get metadata with error handling
url=$(playerctl metadata mpris:artUrl 2>/dev/null)
artist=$(playerctl metadata xesam:artist 2>/dev/null)
album=$(playerctl metadata xesam:album 2>/dev/null)

# Check if we got all required metadata
if [ -z "$url" ] || [ -z "$artist" ] || [ -z "$album" ]; then
    echo "$default_art"
    exit 0
fi

# Create cache directory if it doesn't exist
cache_dir="$HOME/.cache/albumart"
mkdir -p "$cache_dir"

# Create safe filename
safe_name=$(echo "${artist} - ${album}" | tr -dc '[:alnum:] -')
cache_file="$cache_dir/${safe_name}.png"

# Return cached file if exists
if [ -f "$cache_file" ]; then
    echo "$cache_file"
    exit 0
fi

# Download and convert art
if curl -s "$url" -o "$cache_dir/temp_art"; then
    if magick "$cache_dir/temp_art" "$cache_file"; then
        rm -f "$cache_dir/temp_art"
        echo "$cache_file"
        exit 0
    fi
    rm -f "$cache_dir/temp_art"
fi

echo "$default_art"
exit 0