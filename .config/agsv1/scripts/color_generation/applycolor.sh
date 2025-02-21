#!/usr/bin/env bash

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"
CACHE_DIR="$XDG_CACHE_HOME/ags"
STATE_DIR="$XDG_STATE_HOME/ags"
colormodefile="$STATE_DIR/user/colormode.txt"

if [ ! -d "$CACHE_DIR"/user/generated ]; then
    mkdir -p "$CACHE_DIR"/user/generated/colormode.txt
    touch "$STATE_DIR"/user/generated/ags_transparency.txt
fi
cd "$CONFIG_DIR" || exit

# Fetch second line from color mode file
secondline=$(sed -n '2p' "$colormodefile")
fifthline=$(sed -n '5p' "$colormodefile")

if [[ "$secondline" == *"transparent"* ]]; then # Set for transparent background
    ags_transparency=True
    hypr_opacity=0.9
    rofi_alpha=#00000090
    rofi_alpha_element=#00000025
else #Opaque Stuff
    ags_transparency=False
    hypr_opacity=1
    rofi_alpha="var(surface)"
    rofi_alpha_element="var(surface-container-low)"
fi

if [[ "$fifthline" == *"noborder"* ]]; then 
   ags_border=False
   hypr_border="0"
else
   ags_border=True
   hypr_border="2"
fi

get_light_dark() {
    lightdark=""
    if [ ! -f "$STATE_DIR/user/colormode.txt" ]; then
        echo "" > "$STATE_DIR/user/colormode.txt"
    else
        lightdark=$(sed -n '1p' "$STATE_DIR/user/colormode.txt")
    fi
    echo "$lightdark"
}

apply_lightdark() {
    lightdark=$(get_light_dark)
    if [ "$lightdark" = "light" ]; then
        gsettings set org.gnome.desktop.interface color-scheme 'prefer-light'
    else
        gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
    fi
}

update_ags() { 
    agsv1 run-js "handleStyles(false);"
}

# hyprctl keyword general:border_size $hypr_border
apply_borders() {
    sed -i "s/border:.*;/border:$ags_border;/" ~/.config/ags/scss/mode.scss
}


apply_transparency() {
    # Ags
    sed -i "s/$transparent:.*;/$transparent:$ags_transparency;/" ~/.config/ags/scss/mode.scss &
    # Rofi 
    sed -i "s/wbg:.*;/wbg:$rofi_alpha;/" ~/.config/rofi/config.rasi &
    sed -i "s/element-bg:.*;/element-bg:$rofi_alpha_element;/" ~/.config/rofi/config.rasi &
    # Hyprland
    sed -i "s/windowrule = opacity .*\ override/windowrule = opacity $hypr_opacity override/" ~/.config/hypr/hyprland/rules/default.conf  &
}

apply_lightdark &
wait
apply_transparency &
wait 
apply_borders &
wait 
update_ags &
wait
exit 0