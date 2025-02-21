#!/bin/bash
set -e
set -u

THUMBNAIL_DIR="$HOME/Pictures/Wallpapers/thumbnails"
WALLPAPER_DIR="$HOME/Pictures/Wallpapers"

mkdir -p "$THUMBNAIL_DIR"

for image in "$WALLPAPER_DIR"/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF,webp,WEBP}; do
    [ -e "$image" ] || continue

    filename=$(basename "$image")

    if [ -f "$THUMBNAIL_DIR/$filename" ]; then
        echo "Skipping $filename - thumbnail already exists"
        continue
    fi

    if [[ "$image" =~ \.gif$|\.GIF$ ]]; then
        magick "$image[0]" -resize 150x90^ -gravity center -extent 150x90 "$THUMBNAIL_DIR/$filename"
    else
        magick "$image" -resize 150x90^ -gravity center -extent 150x90 "$THUMBNAIL_DIR/$filename"
    fi
done

notify-send "Thumbnails generation complete" 
