#!/bin/bash

get_keyboard_layout() {
    layout=$(hyprctl devices -j | jq -r '.keyboards[] | select(.main == true) | .active_keymap' | cut -c1-2)
    echo -n "$layout ⌨"
}

case "$1" in 
    "watch")
        socat -u UNIX-CONNECT:/tmp/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock - | while read -r line; do
            if [[ $line == "activelayout>>"* ]]; then
                get_keyboard_layout
            fi
        done
        ;;
    *)
        get_keyboard_layout
        ;;
esac
