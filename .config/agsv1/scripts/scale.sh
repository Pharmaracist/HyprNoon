#!/bin/bash
# adjust_font_scaling.sh
# This script adjusts the GTK text-scaling-factor by a given amount.
# Usage: ./adjust_font_scaling.sh <adjustment>
# For example, to increase scaling by 0.1: ./adjust_font_scaling.sh 0.1
# or to decrease by 0.1: ./adjust_font_scaling.sh -0.1

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <adjustment>"
    exit 1
fi

ADJUSTMENT="$1"

# Get the current GTK text scaling factor from gsettings.
CURRENT=$(gsettings get org.gnome.desktop.interface text-scaling-factor)

# Remove any surrounding single quotes if present.
CURRENT=$(echo "$CURRENT" | sed "s/'//g")

# Calculate the new scaling factor using bc for floating point arithmetic.
NEW=$(echo "$CURRENT + $ADJUSTMENT" | bc -l)

# Optionally, ensure the new scaling factor is not less than a minimum (e.g., 0.1)
MIN=0.1
if (( $(echo "$NEW < $MIN" | bc -l) )); then
    NEW=$MIN
fi

# Set the new GTK text scaling factor.
gsettings set org.gnome.desktop.interface text-scaling-factor "$NEW"

exit 0
