#!/bin/bash
# HyprLunaris Bar Selector By PharmaRacist

# Define your modes
modes=(
  "0|Normal|$HOME/.config/ags/assets/bar/0.svg"
  "1|Focus|$HOME/.config/ags/assets/bar/1.svg"
  "2|Floating|$HOME/.config/ags/assets/bar/2.svg"
  "3|Minimal|$HOME/.config/ags/assets/bar/3.svg"
  "4|Anoon|$HOME/.config/ags/assets/bar/4.svg"
  "5|Windows Taskbar|$HOME/.config/ags/assets/bar/5.svg"
  "6|Island|$HOME/.config/ags/assets/bar/6.svg"
  "7|Notch|$HOME/.config/ags/assets/bar/7.svg"
  "8|Saadi|$HOME/.config/ags/assets/bar/8.svg"
  # "9|Vertical|$HOME/.config/ags/assets/bar/9.svg"
  # "10|Vertical Pinned|$HOME/.config/ags/assets/bar/10.svg"
)

# Create a temporary file for the entries list
TEMP_FILE=$(mktemp)

# Build entries: each line will display the BarName with an icon.
# The format used is: <BarName><null>icon<unit separator><ImagePath>
for entry in "${modes[@]}"; do
  IFS='|' read -r mode_id bar_name image_path <<<"$entry"
  # The \0icon\x1f markup tells rofi to use image_path as the icon.
  echo -en "$bar_name\0icon\x1f$image_path\n" >>"$TEMP_FILE"
done

selection=$(cat "$TEMP_FILE" | rofi -dmenu -i -p "Select Bar Mode" -show-icons -theme "$HOME/.config/rofi/rofi.rasi")

# Clean up the temporary file
rm "$TEMP_FILE"

# If a selection was made, determine the corresponding ModeID by matching the bar name.
if [ -n "$selection" ]; then
  selected_mode=""
  for entry in "${modes[@]}"; do
    IFS='|' read -r mode_id bar_name image_path <<<"$entry"
    if [ "$bar_name" = "$selection" ]; then
      selected_mode="$mode_id"
      break
    fi
  done

  # If a mode was found, trigger the bar mode update via agsv1.
  if [ -n "$selected_mode" ]; then
    agsv1 --run-js "updateMonitorShellMode(currentShellMode, 0, '$selected_mode')"
  fi
fi
