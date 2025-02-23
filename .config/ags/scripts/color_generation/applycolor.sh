#!/usr/bin/env bash

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"
STATE_DIR="$XDG_STATE_HOME/ags"
colormodefile="$STATE_DIR/user/colormode.txt"

cd "$CONFIG_DIR" || exit

if [[ $(sed -n '2p' "$colormodefile") == *"transparent"* ]]; then
    ags_transparency=True; hypr_opacity=0.9; rofi_alpha=#00000090; rofi_alpha_element=#00000025
else
    ags_transparency=False; hypr_opacity=1; rofi_alpha="var(surface)"; rofi_alpha_element="var(surface-container-low)"
fi

[[ $(sed -n '5p' "$colormodefile") == *"noborder"* ]] && ags_border=False hypr_border="0" || ags_border=True hypr_border="2"

sed -i "s/border:.*;/border:$ags_border;/; s/\$transparent:.*;/\$transparent:$ags_transparency;/" "$STATE_DIR/scss/_mode.scss"
sed -i "s/wbg:.*;/wbg:$rofi_alpha;/; s/element-bg:.*;/element-bg:$rofi_alpha_element;/" "$XDG_CONFIG_HOME/rofi/config.rasi"  
sed -i "s/windowrule = opacity .*\ override/windowrule = opacity $hypr_opacity override/" "$XDG_CONFIG_HOME/hypr/hyprland/rules/default.conf"

agsv1 run-js "handleStyles(true);" > /dev/null
