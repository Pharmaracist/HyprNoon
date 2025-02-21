#!/usr/bin/env bash

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"
SCRIPTS_DIR="$XDG_CONFIG_HOME/ags/scripts"
CACHE_DIR="$XDG_CACHE_HOME/ags"
STATE_DIR="$XDG_STATE_HOME/ags"

# check if the file $STATE_DIR/user/colormode.txt exists. if not, create it. else, read it to $lightdark
colormodefile="$STATE_DIR/user/colormode.txt"
lightdark=""
transparency=""
materialscheme=""
gowall=""
border=""

if [ ! -f $colormodefile ]; then
    echo "dark" > $colormodefile
    echo "opaque" >> $colormodefile
    echo "content" >> $colormodefile
    echo "none" >> $colormodefile
    echo "noborder" >> $colormodefile
elif [[ $(wc -l < $colormodefile) -ne 5 || $(wc -w < $colormodefile) -ne 5 ]]; then
    echo "dark" > $colormodefile
    echo "opaque" >> $colormodefile
    echo "content" >> $colormodefile
    echo "none" >> $colormodefile
    echo "noborder" >> $colormodefile
else
    lightdark=$(sed -n '1p' $colormodefile)
    transparency=$(sed -n '2p' $colormodefile)
    materialscheme=$(sed -n '3p' $colormodefile)
    gowall=$(sed -n '4p' $colormodefile)
    border=$(sed -n '5p' $colormodefile)
fi

# Get the color mode
COLORMODE_FILE_DIR="/tmp/ags/colormode"
if [ -f "$COLORMODE_FILE_DIR" ]; then
    colormode=$(sed -n '1p' "$COLORMODE_FILE_DIR")
    if [[ "$colormode" == "light" ]]; then
        lightdark="light"
    else
        lightdark="dark"
    fi
fi

cd "$CONFIG_DIR/scripts/" || exit
# Store the image source if it's an image
if [[ ! "$1" = "#"* ]]; then # this is an image
    # Store the image path
    echo "$1" > "$STATE_DIR/user/current_wallpaper.txt"
fi
    matugen image "$1" -m "$lightdark" -t "scheme-$materialscheme" &&
    agsv1 run-js "handleStyles(false);"
